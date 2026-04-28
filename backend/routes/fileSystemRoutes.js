import express from 'express';
import { 
    getFileSystem, 
    createItem, 
    updateItem, 
    deleteItem, 
    moveItem 
} from '../controllers/fileSystemController.js';

const router = express.Router();

router.route('/')
    .get(getFileSystem)
    .post(createItem);

router.route('/:id')
    .put(updateItem)
    .delete(deleteItem);

router.route('/:id/move')
    .put(moveItem);

export default router;
