// Mock implementation of prosemirror-changeset
export const Changeset = jest.fn().mockImplementation(() => ({
  addSteps: jest.fn(),
  getChanges: jest.fn().mockReturnValue([]),
}));

export const ChangeSet = {
  create: jest.fn().mockReturnValue({
    addSteps: jest.fn(),
    getChanges: jest.fn().mockReturnValue([]),
  }),
};
