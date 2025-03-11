import { EditorState } from 'prosemirror-state';
import { Schema, Node, Mark } from 'prosemirror-model';
import { createDecorations } from '../../src/decorations';
import { DecorationSet } from 'prosemirror-view';

// Mock schema
const schema = new Schema({
  nodes: {
    doc: { content: 'text*' },
    text: { inline: true },
  },
  marks: {
    suggestion_add: {
      attrs: { username: { default: '' } },
      inclusive: true,
      excludes: '',
    },
    suggestion_delete: {
      attrs: { username: { default: '' } },
      inclusive: true,
      excludes: '',
    },
  },
});

// Mock hover menu renderer
const mockRenderHoverMenu = jest
  .fn()
  .mockReturnValue(document.createElement('div'));

describe('decorations', () => {
  beforeEach(() => {
    mockRenderHoverMenu.mockClear();
  });

  it('creates decoration for a single suggestion', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'text',
          text: 'Hello world',
          marks: [
            {
              type: 'suggestion_add',
              attrs: { username: 'user1' },
            },
          ],
        },
      ],
    });

    const state = {
      doc,
    } as EditorState;

    const decorations = createDecorations(state, mockRenderHoverMenu);

    expect(decorations).toBeInstanceOf(DecorationSet);
    expect(mockRenderHoverMenu).toHaveBeenCalledTimes(1);
    expect(mockRenderHoverMenu).toHaveBeenCalledWith(
      0, // start
      11, // end (length of "Hello world")
      expect.objectContaining({ username: 'user1' }),
      expect.any(Object)
    );
  });

  it('groups adjacent suggestions by the same user', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'text',
          text: 'Hello ',
          marks: [
            {
              type: 'suggestion_add',
              attrs: { username: 'user1' },
            },
          ],
        },
        {
          type: 'text',
          text: 'world',
          marks: [
            {
              type: 'suggestion_add',
              attrs: { username: 'user1' },
            },
          ],
        },
      ],
    });

    const state = {
      doc,
    } as EditorState;

    const decorations = createDecorations(state, mockRenderHoverMenu);

    expect(decorations).toBeInstanceOf(DecorationSet);
    expect(mockRenderHoverMenu).toHaveBeenCalledTimes(1);
    expect(mockRenderHoverMenu).toHaveBeenCalledWith(
      0, // start
      11, // end (length of "Hello world")
      expect.objectContaining({ username: 'user1' }),
      expect.any(Object)
    );
  });

  it('creates separate decorations for different users', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'text',
          text: 'Hello ',
          marks: [
            {
              type: 'suggestion_add',
              attrs: { username: 'user1' },
            },
          ],
        },
        {
          type: 'text',
          text: 'world',
          marks: [
            {
              type: 'suggestion_add',
              attrs: { username: 'user2' },
            },
          ],
        },
      ],
    });

    const state = {
      doc,
    } as EditorState;

    const decorations = createDecorations(state, mockRenderHoverMenu);

    expect(decorations).toBeInstanceOf(DecorationSet);
    expect(mockRenderHoverMenu).toHaveBeenCalledTimes(2);
    expect(mockRenderHoverMenu).toHaveBeenNthCalledWith(
      1,
      0, // start
      6, // end (length of "Hello ")
      expect.objectContaining({ username: 'user1' }),
      expect.any(Object)
    );
    expect(mockRenderHoverMenu).toHaveBeenNthCalledWith(
      2,
      6, // start
      11, // end (start + length of "world")
      expect.objectContaining({ username: 'user2' }),
      expect.any(Object)
    );
  });

  it('creates no decorations when there are no suggestions', () => {
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'text',
          text: 'Hello world',
        },
      ],
    });

    const state = {
      doc,
    } as EditorState;

    const decorations = createDecorations(state, mockRenderHoverMenu);

    expect(decorations).toBeInstanceOf(DecorationSet);
    expect(mockRenderHoverMenu).not.toHaveBeenCalled();
  });
});
