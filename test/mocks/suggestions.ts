export const suggestionsPluginKey = {
  getState: jest.fn(),
  get: jest.fn(),
  key: 'suggestions',
};

export const suggestionsPlugin = {
  props: {
    handleClick: jest.fn().mockReturnValue(false),
    handleKeyDown: jest.fn().mockReturnValue(false),
  },
  getState: jest.fn(),
  spec: {
    state: {
      init: jest.fn(),
      apply: jest.fn(),
    },
  },
  key: suggestionsPluginKey,
};
