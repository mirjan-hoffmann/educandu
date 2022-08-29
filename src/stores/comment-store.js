import Database from './database.js';
import { validate } from '../domain/validation.js';
import { commentDBSchema } from '../domain/schemas/comment-schemas.js';

class CommentStore {
  static get inject() { return [Database]; }

  constructor(db) {
    this.collection = db.comments;
  }

  getCommentById(commentId, { session } = {}) {
    return this.collection.findOne({ _id: commentId }, { session });
  }

  getAllCommentsByDocumentId(documentId, { session } = {}) {
    return this.collection.find({ $and: [{ documentId }, { deletedOn: null }] }, { session }).toArray();
  }

  deleteCommentById(commentId, { session } = {}) {
    return this.collection.deleteOne({ _id: commentId }, { session });
  }

  saveComment(comment, { session } = {}) {
    validate(comment, commentDBSchema);
    return this.collection.replaceOne({ _id: comment._id }, comment, { session, upsert: true });
  }

  deleteCommentsByDocumentIds(documentIds, { session } = {}) {
    return this.collection.deleteMany({ documentId: { $in: documentIds } }, { session });
  }
}

export default CommentStore;
