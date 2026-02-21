module.exports = {
  deleteItemAsync: jest.fn().mockResolvedValue(),
  getItemAsync: jest.fn().mockResolvedValue('stored-value'),
  setItemAsync: jest.fn().mockResolvedValue(),
};
