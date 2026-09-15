# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# CLAUDE.md — React 19 + TypeScript + Clean Architecture Standards

Your goal is to produce **production-ready** code: readable, maintainable, strictly typed (TypeScript), tested, accessible, performant, and consistent with clean architecture principles.

---

## 0) Default Assumptions

- **React 19+** (19.2 preferred) with **TypeScript** in strict mode.
- **Functional** approach + hooks (no class components, ever).
- Modular, reusable code with zero duplication.
- Style: simple, direct, no over-engineering. Do not introduce new libraries without a justified reason.
- Follow existing project conventions. If none exist, apply these standards.
- Do not change the stack (router, state lib, styling solution) unless the project already uses it.

---

## 1) Non-Negotiable Rules (Must)

1. **TypeScript strict mode**: no `any` unless justified with a documented comment explaining why.
2. **Small components**: one component = one clear responsibility. Max ~150 lines; extract if larger.
3. **No business logic in JSX**: extract into helpers, hooks, or services.
4. **No side effects in render**: side effects belong exclusively in `useEffect`, handlers, or Actions.
5. **No unnecessary derived state**: derive via `useMemo` or direct computation, never via `useEffect` setting state from props.
6. **Accessibility is mandatory**: labels, roles, keyboard navigation, focus management, visible focus.
7. **Error handling everywhere**: `try/catch` + user-facing error messages + `loading/error/empty` states for every async operation.
8. **Immutability**: no mutations. Use spread, `map`, `filter`, `structuredClone`, or immer if already in the project.
9. **Consistent code**: same patterns everywhere, clear names, well-organized files.
10. **Every change must preserve existing behavior**: never break what already works unless explicitly refactoring.
11. **No dead code**: remove unused imports, variables, functions, and commented-out code.
12. **No console statements in production code**: use a logger utility or remove before committing.

---

## 2) Naming Conventions

| Element              | Convention          | Example                              |
|----------------------|---------------------|--------------------------------------|
| Components           | `PascalCase`        | `UserCard.tsx`                       |
| Hooks                | `useXxx`            | `useDebounce`, `useFetch`            |
| Utility functions    | `camelCase`         | `formatDate`, `parseUserId`          |
| Types / Interfaces   | `PascalCase`        | `User`, `UserDTO`, `CreateUserInput` |
| Event props          | `onXxx`             | `onSelect`, `onChange`               |
| Internal handlers    | `handleXxx`         | `handleSubmit`, `handleClick`        |
| Boolean variables    | `is/has/can/should` | `isOpen`, `hasError`, `canEdit`      |
| Constants            | `UPPER_SNAKE_CASE`  | `MAX_RETRIES`, `API_BASE_URL`        |
| Enum values          | `PascalCase`        | `Status.Active`, `Role.Admin`        |
| Files (non-component)| `camelCase`         | `userService.ts`, `dateUtils.ts`     |

---

## 3) Project Structure (Feature-First / Clean Architecture)

Prefer a **feature-first** structure that respects clean architecture boundaries:

```
src/
├── app/                        # Bootstrap, providers, router, global config
│   ├── providers/
│   ├── routes/
│   └── App.tsx
├── features/                   # Business features (bounded contexts)
│   └── notes/
│       ├── components/         # UI components specific to this feature
│       ├── hooks/              # Feature-specific hooks
│       ├── api/                # API calls / data access layer
│       ├── services/           # Business logic / use cases
│       ├── types/              # Feature-specific types
│       ├── utils/              # Feature-specific utilities
│       └── index.ts            # Public API (barrel export)
├── shared/                     # Shared, generic, reusable code
│   ├── components/             # Generic UI components (Button, Modal, etc.)
│   ├── hooks/                  # Generic hooks (useDebounce, useLocalStorage)
│   ├── services/               # Generic services (logger, analytics)
│   ├── utils/                  # Generic utilities (formatDate, cn)
│   ├── types/                  # Shared types and interfaces
│   └── constants/              # App-wide constants
├── styles/                     # Global styles, theme, design tokens
└── test/                       # Test utilities, setup, mocks
```

### Architecture Rules

- **A feature must never import directly from another feature.** Cross-feature communication goes through `shared/` or `app/` (e.g., a shared event bus, context, or route-level orchestration).
- **`shared/` contains only truly generic, reusable code.** If it's specific to one feature, it belongs in that feature.
- **Barrel exports** (`index.ts`) define the public API of each feature. Internal implementation details stay internal.
- **Dependency direction**: `components → hooks → services → api → types`. Never the reverse.

---

## 4) Clean Architecture Principles

### 4.1 Separation of Concerns

Every layer has one job:

| Layer           | Responsibility                        | Example                       |
|-----------------|---------------------------------------|-------------------------------|
| **UI (View)**   | Render, user interaction, accessibility | React components              |
| **Hooks**       | Orchestrate state and side effects     | `useNotes`, `useAuth`         |
| **Services**    | Business logic, validation, transforms | `noteService.ts`              |
| **API (Data)**  | Network calls, storage, external I/O   | `noteApi.ts`                  |
| **Types**       | Contracts, DTOs, domain models         | `Note`, `CreateNoteDTO`       |

### 4.2 Dependency Inversion

- High-level modules should not depend on low-level modules. Both should depend on abstractions (types/interfaces).
- API implementations should conform to interfaces so they can be swapped (e.g., mock for testing).

```ts
// Define the contract
interface NoteRepository {
  getAll(): Promise<Note[]>;
  getById(id: NoteId): Promise<Note>;
  create(input: CreateNoteInput): Promise<Note>;
}

// Implement it
const noteApi: NoteRepository = {
  getAll: () => fetchJson('/api/notes'),
  getById: (id) => fetchJson(`/api/notes/${id}`),
  create: (input) => postJson('/api/notes', input),
};
```

### 4.3 Single Responsibility Principle (SRP)

- Each function, hook, component, and module does exactly one thing.
- If a component handles fetching, transforming, and rendering, split it.

### 4.4 Open/Closed Principle

- Prefer composition and configuration over modification.
- Components and hooks should be extendable (via props, generics, slots) without changing their source.

### 4.5 Interface Segregation

- Don't force components to accept props they don't use.
- Split large prop interfaces into smaller, focused ones.

```ts
// ❌ Bad: one mega interface
type Props = { user: User; onEdit: () => void; showAvatar: boolean; theme: Theme; ... };

// ✅ Good: compose smaller interfaces
type UserDisplayProps = { user: User; showAvatar?: boolean };
type UserActionsProps = { onEdit: () => void };
type UserCardProps = UserDisplayProps & UserActionsProps;
```

### 4.6 Domain Model Integrity

- Define clear domain types distinct from DTOs.
- Map API responses (DTOs) to domain models at the API boundary.
- Never let raw API shapes leak into components.

```ts
// DTO from API
type NoteDTO = { id: string; title: string; body: string; created_at: string };

// Domain model
type Note = { id: NoteId; title: string; body: string; createdAt: Date };

// Mapper at the API boundary
function toNote(dto: NoteDTO): Note {
  return { id: dto.id as NoteId, title: dto.title, body: dto.body, createdAt: new Date(dto.created_at) };
}
```

---

## 5) React 19 Specific Patterns

### 5.1 Actions & Transitions

React 19 introduces **Actions** as a first-class concept for handling async mutations:

```tsx
function UpdateNameForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      await updateName(name);
    });
  };

  return (
    <form>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={handleSubmit} disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### 5.2 New Hooks (React 19+)

- **`useActionState`**: manage state during transitions (forms, mutations). Prefer this over manual `useState` + `useTransition` combos for form workflows.
- **`useOptimistic`**: instant UI updates that roll back on failure. Use for high-interaction UIs (likes, toggles, chat).
- **`useFormStatus`**: read form pending/error state from deeply nested components without prop drilling.
- **`use()`**: read Promises or Context directly in render. Combine with `<Suspense>` for async data.

```tsx
// useOptimistic example
const [optimisticItems, addOptimistic] = useOptimistic(
  items,
  (current, newItem: Item) => [...current, { ...newItem, pending: true }],
);
```

### 5.3 React 19.2 — `useEffectEvent` & `<Activity />`

- **`useEffectEvent`**: separates event-like logic from reactive effects. Creates callbacks that always see the latest props/state without causing the effect to re-run.

```tsx
function ChatRoom({ roomId, theme }: { roomId: string; theme: string }) {
  const onConnected = useEffectEvent(() => {
    showNotification('Connected!', theme); // always sees latest theme
  });

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('connected', () => onConnected());
    return () => connection.disconnect();
  }, [roomId]); // theme is NOT a dependency — correct!
}
```

**Rules for `useEffectEvent`:**
- Only call from inside `useEffect` or other `useEffectEvent`.
- Never pass as props to children.
- Never add to dependency arrays.
- Don't use it to hide legitimate dependencies — only for genuinely non-reactive logic.

- **`<Activity />`**: hides a React subtree, unmounts its effects while preserving state, and renders it with lower priority. Use for tabs, sidebars, multi-page forms where you want to preserve state without unmounting.

```tsx
<Activity mode={showSidebar ? 'visible' : 'hidden'}>
  <Sidebar />
</Activity>
```

### 5.4 Ref as Prop

React 19 passes `ref` as a regular prop — **`forwardRef` is no longer needed**:

```tsx
// ✅ React 19
function Input({ ref, ...props }: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

### 5.5 React Compiler

If the React Compiler is enabled in the project:
- **Remove manual `useMemo`, `useCallback`, and `React.memo`** — the compiler handles memoization automatically.
- Write plain functions and let the compiler optimize.
- If the compiler is NOT enabled, continue using `useMemo`/`useCallback` pragmatically (see section 7.2).

### 5.6 Document Metadata

React 19 supports `<title>`, `<meta>`, and `<link>` directly in components — they automatically hoist to `<head>`:

```tsx
function BlogPost({ post }: { post: Post }) {
  return (
    <>
      <title>{post.title}</title>
      <meta name="description" content={post.summary} />
      <article>{post.content}</article>
    </>
  );
}
```

---

## 6) Component Patterns

### 6.1 Props

- Always type props with an explicit type (not inline).
- Keep props minimal — don't prop-drill unnecessarily.
- Use default parameter values, not `defaultProps`.
- Destructure props in the function signature.

```ts
type UserCardProps = {
  user: User;
  onSelect?: (id: UserId) => void;
  variant?: 'compact' | 'full';
};

function UserCard({ user, onSelect, variant = 'full' }: UserCardProps) {
  // ...
}
```

### 6.2 Clean JSX

- No nested ternaries in JSX.
- Extract branches (loading/empty/error) as **early returns**.
- Keep the happy path at the bottom.

```tsx
function NoteList({ notes, isLoading, error }: NoteListProps) {
  if (isLoading) return <Spinner />;
  if (error) return <ErrorState message={error.message} />;
  if (!notes.length) return <EmptyState message="No notes yet" />;

  return (
    <ul>
      {notes.map((note) => (
        <NoteItem key={note.id} note={note} />
      ))}
    </ul>
  );
}
```

### 6.3 Composition Over Inheritance

- Prefer `children`, render props, or slot-based patterns.
- Use container/presentational split when it clarifies responsibilities.
- Don't create premature abstractions — a simple component is fine.

### 6.4 Component Size

- A component file should not exceed ~150 lines. If it does, extract sub-components, hooks, or helpers.
- If a component has more than 5-6 props, consider if it's doing too much.

---

## 7) Hooks — Best Practices

### 7.1 `useEffect`

`useEffect` is for **synchronizing with external systems** (API, DOM, subscriptions, storage).

**Rules:**
- Always clean up (AbortController, removeEventListener, disconnect).
- Correct dependency arrays — no "dependency cheating" (eslint-plugin-react-hooks must be enabled).
- Never use `useEffect` to derive state from props — compute directly or use `useMemo`.
- Prefer React 19 Actions/transitions over `useEffect` for mutations.

```ts
useEffect(() => {
  const controller = new AbortController();

  async function fetchData() {
    try {
      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();
      setData(data);
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') {
        setError(e as Error);
      }
    }
  }

  fetchData();
  return () => controller.abort();
}, [url]);
```

### 7.2 `useMemo` / `useCallback`

- Use only when there's a **real performance benefit**: preventing expensive recalculations, stabilizing props for memoized children, or maintaining referential equality for dependency arrays.
- Don't memoize everything by default.
- If the React Compiler is enabled, these are likely unnecessary — the compiler optimizes automatically.

### 7.3 Custom Hooks

- Extract reusable logic into custom hooks.
- Return a clear API: `{ data, isLoading, error, refetch }`.
- Name starts with `use`.
- A custom hook should be testable independently of UI.

```ts
function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ... fetch logic with cleanup

  return { notes, isLoading, error, refetch } as const;
}
```

---

## 8) State Management (Preference Order)

1. **`useState` / `useReducer`** — for local UI state.
2. **React 19 `useActionState`** — for form/mutation state tied to transitions.
3. **React Context** — only when state is genuinely shared across distant components. Never use as a global store for everything.
4. **Server cache (React Query / SWR / TanStack Query)** — for server state, if already in the project.
5. **External store (Zustand, Jotai, Redux Toolkit)** — only if the project already uses one.

**Rules:**
- Avoid "mega context" (one giant context with everything).
- Prefer `useReducer` for complex state with multiple related transitions.
- Keep server state and UI state separate.
- Never store derived state — compute it.

---

## 9) Data Fetching & API Layer

### 9.1 Structure

- Centralize API calls: `features/x/api/noteApi.ts`.
- API modules must not depend on React components or hooks.
- Map DTOs to domain models at the boundary (see section 4.6).
- Uniform error handling across all API functions.

### 9.2 Naming

- `getX`, `getXById`, `createX`, `updateX`, `deleteX`, `searchX`.
- Return strict types, never `any` or `unknown` (validate/cast at the boundary).

### 9.3 Error Handling

```ts
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new ApiError(res.status, `Request failed: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
```

---

## 10) TypeScript Standards

### 10.1 Strict Configuration

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false, // enable when feasible
    "forceConsistentCasingInFileNames": true
  }
}
```

### 10.2 Type Rules

- **Never use `any`** without a documented justification comment: `// eslint-disable-next-line @typescript-eslint/no-explicit-any — reason`.
- Prefer `unknown` over `any` when the type is genuinely unknown, and narrow with type guards.
- No `as unknown as X` casts unless absolutely required with a comment.
- Use **discriminated unions** for state machines and variant types.
- Prefer `type` over `interface` for consistency (unless extending is needed).
- Use branded types for IDs: `type UserId = string & { readonly __brand: 'UserId' }`.
- Generic types should have meaningful names: `TData`, `TError`, not `T`, `U`.

### 10.3 Exhaustive Checks

```ts
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

// Use in switch statements for exhaustive matching
switch (status) {
  case 'idle': return null;
  case 'loading': return <Spinner />;
  case 'error': return <ErrorState />;
  case 'success': return <Data />;
  default: return assertNever(status);
}
```

---

## 11) Performance (Pragmatic)

- **Avoid unnecessary re-renders**: stable props, component splitting, memoization where justified.
- **List keys**: always use stable, unique IDs — never array index if the list can reorder, filter, or grow.
- **Virtualization**: only for genuinely large lists (hundreds/thousands of items). Use `react-window` or `@tanstack/react-virtual` if already available.
- **Code splitting**: `React.lazy()` + `<Suspense>` for route-level or heavy feature splits.
- **Images**: lazy loading (`loading="lazy"`), proper `width`/`height`, modern formats (WebP/AVIF).
- **Debounce** expensive operations (search inputs, resize handlers).
- **React 19 `<Activity />`**: use for state-preserving hide/show instead of conditional unmounting.
- **Profile first, optimize second**: don't optimize without measuring. Use React DevTools Profiler and browser performance tools.

---

## 12) Accessibility (A11y) — Mandatory

### 12.1 Rules

- Every `<input>` has an associated `<label>` (via `htmlFor` or wrapping).
- Clickable elements are `<button>` or `<a>`, never `<div onClick>`.
- Use semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`, `<header>`, `<footer>`).
- `aria-*` attributes only when semantic HTML isn't sufficient — and always correctly.
- Focus management: modals trap focus, dialogs return focus on close, menus are navigable.
- Keyboard navigation: logical tab order, all interactive elements reachable, no keyboard traps.
- Readable contrast ratios (WCAG AA minimum: 4.5:1 for normal text).
- Announce dynamic changes to screen readers (`aria-live`, `role="alert"`).

### 12.2 Quick Checklist

- [ ] All inputs have labels
- [ ] Focus is visible on all interactive elements
- [ ] Correct roles on custom components
- [ ] No keyboard traps
- [ ] Error messages are accessible (associated with inputs, announced)
- [ ] Images have meaningful `alt` text (or `alt=""` for decorative)
- [ ] Page has a single `<h1>`, heading hierarchy is logical

---

## 13) Styling Rules

- **Stick to the project's existing solution** (Tailwind, CSS Modules, styled-components, etc.).
- No inline styles except for genuinely dynamic values (e.g., `style={{ width: calculatedWidth }}`).
- Maintain a consistent design system: spacing scale, color palette, typography.
- Long Tailwind class strings → extract into component or utility (e.g., `cn()` or `cva()`).
- Use CSS variables for theming when possible.
- Responsive by default: mobile-first approach.

---

## 14) Code Quality — Lint & Format

- Respect existing ESLint + Prettier configuration.
- **Imports sorted** (group: external → internal → relative → types).
- No `console.log` in production (use a logger or remove).
- No dead code (unused variables, unreachable code, commented-out blocks).
- No `// TODO` without an associated issue/ticket reference.

If no config exists, generate code compatible with:
- Prettier (default config)
- ESLint with `eslint-plugin-react-hooks` v6+, `@typescript-eslint`
- TypeScript strict mode

---

## 15) Testing Standards

### 15.1 Stack

- **React Testing Library** + **Vitest** (or Jest) if present in the project.
- E2E: Playwright or Cypress if present.

### 15.2 Philosophy

- **Test user behavior**, not implementation details.
- Query by role, label, or text — not by class name or test ID (use `data-testid` only as last resort).
- Each important bug fix should include a regression test.
- Test the contract (inputs → outputs), not internal state.

### 15.3 Patterns

```tsx
// ✅ Good: test what the user sees and does
it('shows an error message when submission fails', async () => {
  server.use(http.post('/api/notes', () => HttpResponse.error()));

  render(<CreateNoteForm />);
  await userEvent.type(screen.getByRole('textbox', { name: /title/i }), 'My note');
  await userEvent.click(screen.getByRole('button', { name: /save/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/failed/i);
});
```

### 15.4 Rules

- Prefer `screen.getByRole(...)` over `getByTestId`.
- Avoid massive snapshot tests.
- Mock API calls (MSW preferred), not internal modules.
- Each test file mirrors the source file: `NoteList.tsx` → `NoteList.test.tsx`.

---

## 16) Security (Frontend)

- **Never use `dangerouslySetInnerHTML`** unless the content is sanitized (DOMPurify or equivalent) and the use case is documented.
- Validate and escape all user inputs on the UI side.
- Never log secrets, tokens, API keys, or sensitive data.
- Use `HttpOnly` + `Secure` cookies for auth tokens when possible.
- CSP (Content Security Policy) headers on production builds.
- Sanitize URL parameters before use.
- Never trust client-side validation alone — it's for UX, not security.

---

## 17) Error Handling Patterns

### 17.1 Error Boundaries

Every major feature should have an Error Boundary:

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function FeatureErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert">
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

// Usage
<ErrorBoundary FallbackComponent={FeatureErrorFallback}>
  <NotesFeature />
</ErrorBoundary>
```

### 17.2 Async Error Handling

Every async operation must handle errors:

```tsx
const [state, action] = useActionState(async (prev, formData: FormData) => {
  try {
    const result = await createNote(formData);
    return { status: 'success' as const, data: result };
  } catch (e) {
    return { status: 'error' as const, message: (e as Error).message };
  }
}, { status: 'idle' as const });
```

---

## 18) Common Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
|---|---|
| `useEffect(() => setState(derive(props)))` | Compute directly or use `useMemo` |
| God component (400+ lines) | Extract sub-components, hooks, services |
| `any` / `as unknown as X` without reason | Use proper types, generics, type guards |
| Direct mutation (`array.push`, `obj.x = y`) | Immutable updates (spread, map, filter) |
| `key={index}` on dynamic lists | Use stable unique IDs |
| Stacking `useEffect` for derived logic | Structure into hooks/services |
| Business logic in UI components | Extract to hooks or service layer |
| Prop drilling through 4+ levels | Use context, composition, or state management |
| `forwardRef` in React 19 | Pass `ref` as a regular prop |
| Manual memoization with React Compiler active | Remove `useMemo`/`useCallback`, let compiler handle it |
| `useEffect` for data mutations | Use React 19 Actions / `useActionState` |
| Catching errors silently (`catch (e) {}`) | Always handle or re-throw with user feedback |
| String-based event systems for cross-component communication | Use proper state management, context, or composition |

---

## 19) Git & Code Review Standards

- **Commits**: atomic, one logical change per commit. Use conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- **PRs**: small and focused. One feature or fix per PR.
- **Branch naming**: `feat/note-editor`, `fix/sidebar-crash`, `refactor/api-layer`.
- **No generated or build files** in version control.

---

## 20) Response Format

When proposing code changes:

1. **Briefly explain** what you're changing and why.
2. **Provide the complete final code** for all modified files (or a clear, unambiguous patch).
3. **Mention impacts**: tests to add/update, type changes, breaking changes, accessibility considerations.
4. **Follow all standards above** — every code block you produce must comply.

---

## 21) Pre-Delivery Checklist

Before finalizing any code:

- [ ] TypeScript compiles with zero errors and zero warnings
- [ ] No functional regressions — existing behavior preserved
- [ ] `loading` / `error` / `empty` states handled for all async flows
- [ ] Accessibility: labels, roles, focus management, keyboard navigation
- [ ] Code is readable: clear names, no duplication, logical structure
- [ ] No heavy logic in JSX — extracted to hooks/helpers
- [ ] Imports are clean and sorted
- [ ] No `any`, no dead code, no `console.log`
- [ ] Tests added for critical logic and bug fixes
- [ ] Immutable data patterns used throughout
- [ ] Error boundaries in place for feature-level fault isolation
- [ ] Clean architecture layers respected: UI → hooks → services → API → types
