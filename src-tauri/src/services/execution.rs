//! Shared policy for one-shot metadata requests and streaming downloads.
use anyhow::{bail, Result};
use serde::{Deserialize, Serialize};
use std::{collections::BTreeSet, future::Future};

use super::{
    request_error::RequestFailure,
    runtime::Runtime,
    settings::{AppSettings, ImpersonationMode},
};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionContext {
    pub settings_revision: u64,
    pub runtime_id: String,
    pub browser: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttemptProgress {
    pub browser: Option<String>,
    pub attempt: u32,
}

/// Request-specific network options; future cookie options belong at this boundary.
#[derive(Clone, Debug)]
pub struct RequestOptions {
    pub browser: Option<String>,
}

impl RequestOptions {
    pub fn apply(&self, command: &mut tokio::process::Command) {
        if let Some(browser) = &self.browser {
            command.args(["--impersonate", browser]);
        }
    }
}

#[derive(Clone, Debug)]
pub struct Attempt {
    pub runtime: Runtime,
    pub options: RequestOptions,
}

pub struct ExecutionPlan {
    pub revision: u64,
    pub attempts: Vec<Attempt>,
    pub missing_profiles: bool,
}

pub fn build_plan(
    settings: &AppSettings,
    url: &str,
    runtimes: &[Runtime],
    hint: Option<&ExecutionContext>,
) -> Result<ExecutionPlan> {
    let policy = settings.policy_for_url(url)?;
    let available: Vec<_> = runtimes.iter().filter(|r| r.version.is_some()).collect();
    let Some(normal) = available.first() else {
        bail!("No working yt-dlp installation found. Install yt-dlp and refresh the browser profiles in Settings.");
    };
    let browsers: BTreeSet<_> = available
        .iter()
        .flat_map(|r| r.browsers.iter().cloned())
        .collect();
    let mut order = vec![
        policy.browser,
        "chrome".into(),
        "edge".into(),
        "firefox".into(),
        "safari".into(),
    ];
    order.extend(browsers.iter().cloned());
    let mut attempts = Vec::new();
    if policy.mode != ImpersonationMode::Always {
        attempts.push(Attempt {
            runtime: (*normal).clone(),
            options: RequestOptions { browser: None },
        });
    }
    if policy.mode != ImpersonationMode::Never {
        let mut seen = BTreeSet::new();
        for browser in order {
            if !seen.insert(browser.clone()) {
                continue;
            }
            if let Some(runtime) = available.iter().find(|r| r.supports(&browser)) {
                attempts.push(Attempt {
                    runtime: (*runtime).clone(),
                    options: RequestOptions {
                        browser: Some(browser),
                    },
                });
            }
        }
    }
    if let Some(hint) = hint.filter(|hint| hint.settings_revision == settings.revision) {
        let permitted = match policy.mode {
            ImpersonationMode::Never => hint.browser.is_none(),
            ImpersonationMode::Always => hint.browser.is_some(),
            ImpersonationMode::Automatic => true,
        };
        if permitted {
            if let Some(runtime) = available.iter().find(|r| {
                r.id == hint.runtime_id && hint.browser.as_ref().is_none_or(|b| r.supports(b))
            }) {
                // The successful browser is tried first; do not repeat a failed normal request.
                attempts.retain(|a| {
                    a.options.browser != hint.browser
                        && (hint.browser.is_none() || a.options.browser.is_some())
                });
                attempts.insert(
                    0,
                    Attempt {
                        runtime: (*runtime).clone(),
                        options: RequestOptions {
                            browser: hint.browser.clone(),
                        },
                    },
                );
            }
        }
    }
    if attempts.is_empty() {
        bail!("Browser impersonation is unavailable. Install yt-dlp with curl_cffi, then refresh browser profiles in Settings.");
    }
    Ok(ExecutionPlan {
        revision: settings.revision,
        attempts,
        missing_profiles: policy.mode != ImpersonationMode::Never && browsers.is_empty(),
    })
}

pub async fn execute<T, F, Fut>(
    plan: &ExecutionPlan,
    on_attempt: impl Fn(&ExecutionContext, u32),
    mut operation: F,
) -> Result<(T, ExecutionContext)>
where
    F: FnMut(Attempt) -> Fut,
    Fut: Future<Output = Result<T>>,
{
    let mut failures = Vec::new();
    for (index, attempt) in plan.attempts.iter().enumerate() {
        let context = ExecutionContext {
            settings_revision: plan.revision,
            runtime_id: attempt.runtime.id.clone(),
            browser: attempt.options.browser.clone(),
        };
        on_attempt(&context, index as u32 + 1);
        match operation(attempt.clone()).await {
            Ok(value) => return Ok((value, context)),
            Err(error) => {
                if !error
                    .downcast_ref::<RequestFailure>()
                    .is_some_and(|failure| failure.retryable)
                {
                    return Err(error);
                }
                failures.push(format!(
                    "{}: {}",
                    context.browser.as_deref().unwrap_or("Standard request"),
                    error
                ));
            }
        }
    }
    if plan.missing_profiles {
        failures.push("No browser profiles available. Install yt-dlp with curl_cffi and refresh profiles in Settings.".into());
    }
    bail!("{}", failures.join("\n"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::settings::{AppSettings, ImpersonationMode};

    fn runtime(id: &str, browsers: &[&str]) -> Runtime {
        Runtime {
            id: id.into(),
            label: id.into(),
            program: "unused".into(),
            prefix: vec![],
            version: Some("test".into()),
            browsers: browsers.iter().map(|s| (*s).into()).collect(),
            error: None,
        }
    }

    #[test]
    fn automatic_uses_python_when_normal_runtime_lacks_profiles() {
        let settings = AppSettings::default();
        let plan = build_plan(
            &settings,
            "https://example.com/video",
            &[
                runtime("system", &[]),
                runtime("py", &["safari", "chrome", "edge"]),
            ],
            None,
        )
        .unwrap();
        let actual: Vec<_> = plan
            .attempts
            .iter()
            .map(|a| (a.runtime.id.as_str(), a.options.browser.as_deref()))
            .collect();
        assert_eq!(
            actual,
            vec![
                ("system", None),
                ("py", Some("chrome")),
                ("py", Some("edge")),
                ("py", Some("safari"))
            ]
        );
    }

    #[test]
    fn tiktok_skips_normal_attempt_and_never_disables_all_retries() {
        let mut settings = AppSettings::default();
        let runtimes = vec![runtime("system", &[]), runtime("py", &["chrome"])];
        let plan = build_plan(&settings, "https://vm.tiktok.com/abc", &runtimes, None).unwrap();
        assert_eq!(plan.attempts.len(), 1);
        assert_eq!(plan.attempts[0].options.browser.as_deref(), Some("chrome"));
        settings.impersonation.mode = ImpersonationMode::Never;
        let plan = build_plan(&settings, "https://example.com/video", &runtimes, None).unwrap();
        assert_eq!(plan.attempts.len(), 1);
        assert_eq!(plan.attempts[0].options.browser, None);
    }

    #[test]
    fn successful_context_skips_known_failed_normal_request_until_settings_change() {
        let mut settings = AppSettings::default();
        let runtimes = vec![runtime("system", &[]), runtime("py", &["chrome", "safari"])];
        let context = ExecutionContext {
            settings_revision: 0,
            runtime_id: "py".into(),
            browser: Some("safari".into()),
        };
        let plan = build_plan(
            &settings,
            "https://example.com/video",
            &runtimes,
            Some(&context),
        )
        .unwrap();
        assert_eq!(plan.attempts[0].options.browser.as_deref(), Some("safari"));
        assert_eq!(plan.attempts.len(), 2);
        settings.revision = 1;
        let plan = build_plan(
            &settings,
            "https://example.com/video",
            &runtimes,
            Some(&context),
        )
        .unwrap();
        assert!(plan.attempts[0].options.browser.is_none());
    }

    #[tokio::test]
    async fn retry_exhaustion_is_bounded_and_local_errors_stop_immediately() {
        let plan = build_plan(
            &AppSettings::default(),
            "https://example.com/v",
            &[runtime("py", &["chrome", "safari"])],
            None,
        )
        .unwrap();
        let mut count = 0;
        let result = execute(
            &plan,
            |_, _| {},
            |_| {
                count += 1;
                async { Err::<(), _>(RequestFailure::from_stderr("HTTP Error 403").into()) }
            },
        )
        .await;
        assert!(result.is_err());
        assert_eq!(count, 3);
        let mut count = 0;
        let result = execute(
            &plan,
            |_, _| {},
            |_| {
                count += 1;
                async { anyhow::bail!("Permission denied") }
            },
        )
        .await as Result<((), ExecutionContext)>;
        assert!(result.is_err());
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn successful_retry_stops_before_remaining_browsers() {
        let plan = build_plan(
            &AppSettings::default(),
            "https://example.com/v",
            &[runtime("py", &["chrome", "safari"])],
            None,
        )
        .unwrap();
        let mut count = 0;
        let (value, context) = execute(
            &plan,
            |_, _| {},
            |attempt| {
                count += 1;
                async move {
                    if attempt.options.browser.as_deref() == Some("chrome") {
                        Ok(42)
                    } else {
                        Err(RequestFailure::from_stderr("HTTP Error 403").into())
                    }
                }
            },
        )
        .await
        .unwrap();
        assert_eq!(value, 42);
        assert_eq!(count, 2);
        assert_eq!(context.browser.as_deref(), Some("chrome"));
    }

    #[test]
    fn unavailable_and_untrusted_contexts_cannot_select_executables() {
        let settings = AppSettings::default();
        let runtimes = [runtime("system", &[])];
        assert!(build_plan(&settings, "https://www.tiktok.com/v", &runtimes, None).is_err());
        let hint = ExecutionContext {
            settings_revision: 0,
            runtime_id: "C:/arbitrary.exe".into(),
            browser: Some("chrome".into()),
        };
        let plan = build_plan(&settings, "https://example.com/v", &runtimes, Some(&hint)).unwrap();
        assert_eq!(plan.attempts[0].runtime.id, "system");
        assert!(plan.missing_profiles);
    }
}
