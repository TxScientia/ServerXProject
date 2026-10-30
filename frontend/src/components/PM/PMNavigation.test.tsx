import { expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '../../test-utils';
import PMNavigation from './PMNavigation';

test('all three navigation tabs still select their chat category', () => {
  const onTabChange = vi.fn();
  render(<PMNavigation activeTab="groups" onTabChange={onTabChange} groupsUnread={0} directUnread={0} systemUnread={0} />);
  for (const [name, value] of [['Gruppen', 'groups'], ['Direkt', 'direct'], ['System', 'system']]) {
    fireEvent.click(screen.getByRole('button', { name }));
    expect(onTabChange).toHaveBeenLastCalledWith(value);
  }
});
