import { createFocusGrid } from './focusGrid';
import { createUiContext, type UiController, type UiDeps } from './context';
import { createControls } from './controls';
import { createEffects } from './effects';
import { createLetters } from './letters';

export type { UiController, UiDeps } from './context';
export { letterElement, loadLetterFonts } from './letters';

export function createUi(deps: UiDeps): UiController {
  const ctx = createUiContext(deps);
  const { input } = deps;

  const ui: UiController = {
    ...createControls(ctx),
    ...createLetters(ctx),
    ...createEffects(ctx),

    focusGrid(options) {
      const grid = createFocusGrid(options);
      const unsubscribe = input.on((intent) => {
        grid.handle(intent);
      });
      const destroy = ctx.track(() => {
        unsubscribe();
        grid.destroy();
      });
      return {
        get index() {
          return grid.index;
        },
        focus: grid.focus,
        setItems: grid.setItems,
        setEnabled: grid.setEnabled,
        destroy,
      };
    },

    destroyAll: ctx.destroyAll,
  };

  return ui;
}
