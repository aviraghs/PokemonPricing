/**
 * Mock database utilities for testing
 */

export class MockCollection {
  private data: any[] = [];

  async findOne(query: any) {
    return this.data.find(item => {
      if (query._id) {
        return item._id === query._id;
      }
      if (query.$or) {
        return query.$or.some((condition: any) => {
          return Object.keys(condition).every(key => item[key] === condition[key]);
        });
      }
      return Object.keys(query).every(key => item[key] === query[key]);
    }) || null;
  }

  async find(query: any = {}) {
    if (Object.keys(query).length === 0) {
      return this.data;
    }
    return this.data.filter(item =>
      Object.keys(query).every(key => item[key] === query[key])
    );
  }

  async insertOne(doc: any) {
    const newDoc = {
      ...doc,
      _id: doc._id || `mock-id-${Date.now()}-${Math.random()}`,
    };
    this.data.push(newDoc);
    return {
      insertedId: newDoc._id,
      acknowledged: true,
    };
  }

  async updateOne(query: any, update: any) {
    const index = this.data.findIndex(item =>
      Object.keys(query).every(key => item[key] === query[key])
    );
    if (index !== -1) {
      if (update.$set) {
        this.data[index] = { ...this.data[index], ...update.$set };
      }
      return { matchedCount: 1, modifiedCount: 1 };
    }
    return { matchedCount: 0, modifiedCount: 0 };
  }

  async deleteOne(query: any) {
    const index = this.data.findIndex(item =>
      Object.keys(query).every(key => item[key] === query[key])
    );
    if (index !== -1) {
      this.data.splice(index, 1);
      return { deletedCount: 1 };
    }
    return { deletedCount: 0 };
  }

  // Helper methods for testing
  clear() {
    this.data = [];
  }

  setData(data: any[]) {
    this.data = [...data];
  }

  getData() {
    return [...this.data];
  }
}

export const mockDatabase = {
  usersCollection: new MockCollection(),
  cardsCollection: new MockCollection(),
  listingsCollection: new MockCollection(),
};

export function resetMockDatabase() {
  mockDatabase.usersCollection.clear();
  mockDatabase.cardsCollection.clear();
  mockDatabase.listingsCollection.clear();
}

export function mockGetDatabase() {
  return Promise.resolve({
    db: {},
    usersCollection: mockDatabase.usersCollection,
    cardsCollection: mockDatabase.cardsCollection,
    listingsCollection: mockDatabase.listingsCollection,
  });
}
