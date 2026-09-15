use crate::services::url_validator;
use anyhow::{anyhow, bail, Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use url::{Host, Url};

const SETTINGS_SCHEMA_VERSION: u32 = 1;

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AppSettings {
    pub schema_version: u32,
    pub revision: u64,
    pub impersonation: ImpersonationSettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            schema_version: SETTINGS_SCHEMA_VERSION,
            revision: 0,
            impersonation: ImpersonationSettings {
                mode: ImpersonationMode::Automatic,
                browser: "chrome".to_string(),
                sites: vec![SiteRule {
                    domain: "tiktok.com".to_string(),
                    mode: ImpersonationMode::Always,
                    browser: Some("chrome".to_string()),
                }],
            },
        }
    }
}

impl AppSettings {
    pub fn policy_for_url(&self, raw_url: &str) -> Result<ImpersonationPolicy> {
        let validated = url_validator::validate_url(raw_url).map_err(anyhow::Error::new)?;
        let parsed = Url::parse(&validated).context("parse validated URL")?;
        let hostname = parsed
            .host_str()
            .ok_or_else(|| anyhow!("URL has no hostname"))?
            .trim_end_matches('.')
            .to_ascii_lowercase();

        let matching_rule = self
            .impersonation
            .sites
            .iter()
            .filter(|rule| domain_matches(&hostname, &rule.domain))
            .max_by_key(|rule| rule.domain.len());

        match matching_rule {
            Some(rule) => Ok(ImpersonationPolicy {
                mode: rule.mode,
                browser: rule
                    .browser
                    .clone()
                    .unwrap_or_else(|| self.impersonation.browser.clone()),
            }),
            None => Ok(ImpersonationPolicy {
                mode: self.impersonation.mode,
                browser: self.impersonation.browser.clone(),
            }),
        }
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ImpersonationSettings {
    pub mode: ImpersonationMode,
    pub browser: String,
    pub sites: Vec<SiteRule>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SiteRule {
    pub domain: String,
    pub mode: ImpersonationMode,
    pub browser: Option<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ImpersonationMode {
    Automatic,
    Always,
    Never,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ImpersonationPolicy {
    pub mode: ImpersonationMode,
    pub browser: String,
}

#[derive(Debug)]
pub struct SettingsStore {
    path: PathBuf,
    operation_lock: Mutex<()>,
}

impl SettingsStore {
    pub fn new(path: PathBuf) -> Self {
        Self {
            path,
            operation_lock: Mutex::new(()),
        }
    }

    pub fn get(&self) -> Result<AppSettings> {
        let _guard = self.lock()?;
        self.read()
    }

    pub fn update(&self, mut settings: AppSettings) -> Result<AppSettings> {
        let _guard = self.lock()?;
        let current = self.read()?;

        if settings.revision != current.revision {
            bail!(
                "settings revision conflict: expected {}, received {}",
                current.revision,
                settings.revision
            );
        }

        normalize_and_validate(&mut settings)?;
        settings.revision = current
            .revision
            .checked_add(1)
            .ok_or_else(|| anyhow!("settings revision overflow"))?;
        self.write(&settings)?;
        Ok(settings)
    }

    fn lock(&self) -> Result<MutexGuard<'_, ()>> {
        self.operation_lock
            .lock()
            .map_err(|_| anyhow!("settings store lock is poisoned"))
    }

    fn read(&self) -> Result<AppSettings> {
        let bytes = match fs::read(&self.path) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Ok(AppSettings::default())
            }
            Err(error) => {
                return Err(error)
                    .with_context(|| format!("read settings from {}", self.path.display()))
            }
        };

        let settings: AppSettings = serde_json::from_slice(&bytes)
            .with_context(|| format!("parse settings from {}", self.path.display()))?;
        validate_persisted(&settings)?;
        Ok(settings)
    }

    fn write(&self, settings: &AppSettings) -> Result<()> {
        let parent = self
            .path
            .parent()
            .filter(|path| !path.as_os_str().is_empty())
            .unwrap_or_else(|| Path::new("."));
        fs::create_dir_all(parent)
            .with_context(|| format!("create settings directory {}", parent.display()))?;

        let mut temporary = tempfile::NamedTempFile::new_in(parent)
            .with_context(|| format!("create temporary settings file in {}", parent.display()))?;
        serde_json::to_writer_pretty(temporary.as_file_mut(), settings)
            .context("serialize settings")?;
        temporary
            .as_file_mut()
            .write_all(b"\n")
            .context("finish settings file")?;
        temporary
            .as_file_mut()
            .sync_all()
            .context("flush settings file")?;
        temporary.persist(&self.path).map_err(|error| {
            anyhow!(
                "replace settings file {}: {}",
                self.path.display(),
                error.error
            )
        })?;
        Ok(())
    }
}

fn validate_persisted(settings: &AppSettings) -> Result<()> {
    let mut normalized = settings.clone();
    normalize_and_validate(&mut normalized)?;
    if normalized != *settings {
        bail!("settings contain a site domain that is not normalized");
    }
    Ok(())
}

fn normalize_and_validate(settings: &mut AppSettings) -> Result<()> {
    validate_schema(settings.schema_version)?;
    validate_browser(&settings.impersonation.browser)?;

    let mut domains = HashSet::new();
    for rule in &mut settings.impersonation.sites {
        rule.domain = normalize_domain(&rule.domain)?;
        if !domains.insert(rule.domain.clone()) {
            bail!("duplicate site domain: {}", rule.domain);
        }
        if let Some(browser) = &rule.browser {
            validate_browser(browser)?;
        }
    }
    Ok(())
}

fn validate_schema(schema_version: u32) -> Result<()> {
    if schema_version != SETTINGS_SCHEMA_VERSION {
        bail!(
            "unsupported settings schema version {schema_version}; expected {SETTINGS_SCHEMA_VERSION}"
        );
    }
    Ok(())
}

fn validate_browser(browser: &str) -> Result<()> {
    let mut bytes = browser.bytes();
    let valid = bytes.next().is_some_and(|byte| byte.is_ascii_lowercase())
        && bytes.all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-' || byte == b'_'
        });
    if !valid {
        bail!("invalid browser family identifier: {browser}");
    }
    Ok(())
}

fn normalize_domain(raw_domain: &str) -> Result<String> {
    let trimmed = raw_domain.trim();
    if trimmed.is_empty() {
        bail!("site domain is required");
    }

    let has_http_scheme = trimmed
        .get(..7)
        .is_some_and(|prefix| prefix.eq_ignore_ascii_case("http://"))
        || trimmed
            .get(..8)
            .is_some_and(|prefix| prefix.eq_ignore_ascii_case("https://"));
    let candidate = if has_http_scheme {
        trimmed.to_string()
    } else {
        if trimmed.contains(['/', '?', '#', '@', ':']) {
            bail!("invalid site domain: {trimmed}");
        }
        format!("https://{trimmed}")
    };

    let validated = url_validator::validate_url(&candidate).map_err(anyhow::Error::new)?;
    let parsed = Url::parse(&validated).context("parse validated site domain")?;
    let domain = match parsed.host() {
        Some(Host::Domain(domain)) => domain.trim_end_matches('.').to_ascii_lowercase(),
        Some(Host::Ipv4(_)) | Some(Host::Ipv6(_)) => bail!("IP addresses are not site domains"),
        None => bail!("site domain has no hostname"),
    };
    validate_dns_name(&domain)?;
    Ok(domain)
}

fn validate_dns_name(domain: &str) -> Result<()> {
    if domain.len() > 253 || !domain.contains('.') {
        bail!("invalid or internal site domain: {domain}");
    }
    for label in domain.split('.') {
        let valid = !label.is_empty()
            && label.len() <= 63
            && !label.starts_with('-')
            && !label.ends_with('-')
            && label
                .bytes()
                .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-');
        if !valid {
            bail!("invalid site domain: {domain}");
        }
    }
    Ok(())
}

fn domain_matches(hostname: &str, domain: &str) -> bool {
    hostname == domain
        || hostname
            .strip_suffix(domain)
            .is_some_and(|prefix| prefix.ends_with('.'))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn settings_with_sites(sites: Vec<SiteRule>) -> AppSettings {
        AppSettings {
            schema_version: 1,
            revision: 0,
            impersonation: ImpersonationSettings {
                mode: ImpersonationMode::Automatic,
                browser: "chrome".to_string(),
                sites,
            },
        }
    }

    #[test]
    fn missing_file_returns_initial_defaults_without_creating_it() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("settings.json");
        let store = SettingsStore::new(path.clone());

        let settings = store.get().unwrap();

        assert_eq!(settings.schema_version, 1);
        assert_eq!(settings.revision, 0);
        assert_eq!(settings.impersonation.mode, ImpersonationMode::Automatic);
        assert_eq!(settings.impersonation.browser, "chrome");
        assert_eq!(
            settings.impersonation.sites,
            vec![SiteRule {
                domain: "tiktok.com".to_string(),
                mode: ImpersonationMode::Always,
                browser: Some("chrome".to_string()),
            }]
        );
        assert!(!path.exists());
    }

    #[test]
    fn settings_serialize_to_the_shared_camel_case_contract() {
        assert_eq!(
            serde_json::to_value(AppSettings::default()).unwrap(),
            serde_json::json!({
                "schemaVersion": 1,
                "revision": 0,
                "impersonation": {
                    "mode": "automatic",
                    "browser": "chrome",
                    "sites": [{
                        "domain": "tiktok.com",
                        "mode": "always",
                        "browser": "chrome"
                    }]
                }
            })
        );
    }

    #[test]
    fn update_normalizes_domains_and_persists_the_next_revision() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("nested").join("settings.json");
        let store = SettingsStore::new(path.clone());
        let requested = settings_with_sites(vec![SiteRule {
            domain: " https://BÜCHER.Example/watch?v=1 ".to_string(),
            mode: ImpersonationMode::Always,
            browser: None,
        }]);

        let updated = store.update(requested).unwrap();

        assert_eq!(updated.revision, 1);
        assert_eq!(
            updated.impersonation.sites[0].domain,
            "xn--bcher-kva.example"
        );
        assert_eq!(store.get().unwrap(), updated);
    }

    #[test]
    fn update_rejects_domains_that_collide_after_normalization() {
        let directory = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(directory.path().join("settings.json"));
        let requested = settings_with_sites(vec![
            SiteRule {
                domain: "Example.COM".to_string(),
                mode: ImpersonationMode::Always,
                browser: None,
            },
            SiteRule {
                domain: "https://example.com/path".to_string(),
                mode: ImpersonationMode::Never,
                browser: None,
            },
        ]);

        let error = store.update(requested).unwrap_err().to_string();

        assert!(error.contains("duplicate site domain"));
    }

    #[test]
    fn update_rejects_an_unsupported_schema() {
        let directory = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(directory.path().join("settings.json"));
        let mut unsupported = settings_with_sites(vec![]);
        unsupported.schema_version = 2;
        assert!(store
            .update(unsupported)
            .unwrap_err()
            .to_string()
            .contains("unsupported settings schema version"));
    }

    #[test]
    fn update_rejects_invalid_browser_identifiers() {
        let directory = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(directory.path().join("settings.json"));
        let mut invalid_browser = settings_with_sites(vec![]);
        invalid_browser.impersonation.browser = "Google Chrome".to_string();
        assert!(store
            .update(invalid_browser)
            .unwrap_err()
            .to_string()
            .contains("invalid browser"));
    }

    #[test]
    fn update_rejects_stale_revision_without_changing_the_file() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("settings.json");
        let store = SettingsStore::new(path.clone());
        let current = store.update(settings_with_sites(vec![])).unwrap();
        let persisted_before = fs::read(&path).unwrap();
        let stale = settings_with_sites(vec![]);

        let error = store.update(stale).unwrap_err().to_string();

        assert!(error.contains("settings revision conflict"));
        assert_eq!(fs::read(path).unwrap(), persisted_before);
        assert_eq!(store.get().unwrap(), current);
    }

    #[test]
    fn invalid_existing_json_is_reported_and_never_overwritten() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("settings.json");
        fs::write(&path, b"{ definitely not JSON").unwrap();
        let store = SettingsStore::new(path.clone());

        assert!(store
            .get()
            .unwrap_err()
            .to_string()
            .contains("parse settings"));
        assert!(store
            .update(settings_with_sites(vec![]))
            .unwrap_err()
            .to_string()
            .contains("parse settings"));
        assert_eq!(fs::read(path).unwrap(), b"{ definitely not JSON");
    }

    #[test]
    fn policy_uses_the_most_specific_domain_and_respects_label_boundaries() {
        let settings = AppSettings {
            schema_version: 1,
            revision: 4,
            impersonation: ImpersonationSettings {
                mode: ImpersonationMode::Never,
                browser: "firefox".to_string(),
                sites: vec![
                    SiteRule {
                        domain: "example.com".to_string(),
                        mode: ImpersonationMode::Automatic,
                        browser: None,
                    },
                    SiteRule {
                        domain: "video.example.com".to_string(),
                        mode: ImpersonationMode::Always,
                        browser: Some("chrome".to_string()),
                    },
                ],
            },
        };

        assert_eq!(
            settings
                .policy_for_url("https://deep.video.example.com/watch")
                .unwrap(),
            ImpersonationPolicy {
                mode: ImpersonationMode::Always,
                browser: "chrome".to_string(),
            }
        );
        assert_eq!(
            settings
                .policy_for_url("https://www.example.com/watch")
                .unwrap(),
            ImpersonationPolicy {
                mode: ImpersonationMode::Automatic,
                browser: "firefox".to_string(),
            }
        );
        assert_eq!(
            settings
                .policy_for_url("https://notexample.com/watch")
                .unwrap(),
            ImpersonationPolicy {
                mode: ImpersonationMode::Never,
                browser: "firefox".to_string(),
            }
        );
    }

    #[test]
    fn update_rejects_ip_and_private_domain_rules() {
        let directory = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(directory.path().join("settings.json"));

        for domain in ["127.0.0.1", "localhost", "https://192.168.1.2/path"] {
            let requested = settings_with_sites(vec![SiteRule {
                domain: domain.to_string(),
                mode: ImpersonationMode::Always,
                browser: None,
            }]);
            assert!(store.update(requested).is_err(), "accepted {domain}");
        }
    }
}
