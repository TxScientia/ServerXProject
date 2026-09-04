/**
 * Shared test helpers.
 *
 * `render` wraps components in a MemoryRouter so anything using react-router
 * (links, useNavigate, route params) works under test. Import from here instead
 * of directly from @testing-library/react.
 *
 * API mocking: components call `fetch` via the `apiUrl` helper in ./api. In tests,
 * stub it per test with `jest.spyOn(global, 'fetch')` returning canned JSON, e.g.
 *
 *   jest.spyOn(global, 'fetch').mockResolvedValue(
 *     new Response(JSON.stringify([{ id: '1', title: 'Plot' }]), { status: 200 })
 *   );
 *
 * (If mocking grows unwieldy across many components, revisit MSW — deferred for now
 * due to CRA/Jest v27 compatibility friction.)
 */
import { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

function render(
  ui: ReactElement,
  { route = '/', ...options }: { route?: string } & Omit<RenderOptions, 'wrapper'> = {},
) {
  window.history.pushState({}, 'Test page', route);
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    ),
    ...options,
  });
}

export * from '@testing-library/react';
export { render };
