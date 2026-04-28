import FileSystemItem from '../models/FileSystemItem.js';
import asyncHandler from '../utils/asyncHandler.js';

// @desc    Get all file system items
// @route   GET /api/fs
// @access  Public
export const getFileSystem = asyncHandler(async (req, res) => {
    // In a real OS we'd send the tree. Since Mongoose stores flat documents with parentId,
    // we return the flat list and let the frontend build the tree, OR we can build it here.
    const items = await FileSystemItem.find({});
    res.json(items);
});

// @desc    Create a new file or folder
// @route   POST /api/fs
export const createItem = asyncHandler(async (req, res) => {
    const { name, type, parentId, content } = req.body;

    const item = await FileSystemItem.create({
        name,
        type,
        parentId: parentId || null,
        content: content || ''
    });

    res.status(201).json(item);
});

// @desc    Update item (rename or update content)
// @route   PUT /api/fs/:id
export const updateItem = asyncHandler(async (req, res) => {
    const { name, content } = req.body;

    const item = await FileSystemItem.findById(req.params.id);

    if (item) {
        item.name = name || item.name;
        if (content !== undefined && item.type === 'file') {
            item.content = content;
        }
        
        // This save() will trigger our pre-save hooks (updating size and path!)
        const updatedItem = await item.save(); 
        res.json(updatedItem);
    } else {
        res.status(404);
        throw new Error('Item not found');
    }
});

// @desc    Delete item
// @route   DELETE /api/fs/:id
export const deleteItem = asyncHandler(async (req, res) => {
    const item = await FileSystemItem.findById(req.params.id);

    if (item) {
        // Note: For a robust file system, we would recursively delete all children.
        // Here we do a simple cascading delete for direct children as a demonstration.
        await FileSystemItem.deleteMany({ parentId: item._id }); 
        await FileSystemItem.deleteOne({ _id: item._id });
        res.json({ message: 'Item and its direct children removed' });
    } else {
        res.status(404);
        throw new Error('Item not found');
    }
});

// @desc    Move item to new parent
// @route   PUT /api/fs/:id/move
export const moveItem = asyncHandler(async (req, res) => {
    const { parentId } = req.body;
    
    const item = await FileSystemItem.findById(req.params.id);
    
    if (item) {
        item.parentId = parentId || null;
        
        // This will trigger the pre-save hook to recalculate the path based on the new parent
        const updatedItem = await item.save(); 
        res.json(updatedItem);
    } else {
        res.status(404);
        throw new Error('Item not found');
    }
});
