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

// Helper to recursively collect all descendant IDs
const collectDescendantIds = async (rootId) => {
    const collectedIds = [];
    const queue = [rootId];
    while (queue.length > 0) {
        const currentId = queue.shift();
        const children = await FileSystemItem.find({ parentId: currentId });
        for (const child of children) {
            collectedIds.push(child._id);
            if (child.type === 'folder') {
                queue.push(child._id);
            }
        }
    }
    return collectedIds;
};

// @desc    Delete item
// @route   DELETE /api/fs/:id
export const deleteItem = asyncHandler(async (req, res) => {
    const item = await FileSystemItem.findById(req.params.id);

    if (item) {
        // Recursively collect all descendant IDs starting from item._id using FileSystemItem
        const collectedIds = await collectDescendantIds(item._id);
        
        // Delete all descendants and the root in one operation
        await FileSystemItem.deleteMany({ _id: { $in: collectedIds } }); 
        await FileSystemItem.deleteOne({ _id: item._id });
        
        res.json({ message: 'Item and all its descendants removed' });
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
        if (parentId) {
            let currentParentId = parentId;
            let isCircular = false;
            while (currentParentId) {
                if (currentParentId.toString() === item._id.toString()) {
                    isCircular = true;
                    break;
                }
                const parentDoc = await FileSystemItem.findById(currentParentId);
                currentParentId = parentDoc ? parentDoc.parentId : null;
            }
            if (isCircular) {
                res.status(400);
                return res.json({ message: 'Cannot move item into itself or one of its descendants' });
            }
        }

        item.parentId = parentId || null;
        
        // This will trigger the pre-save hook to recalculate the path based on the new parent
        const updatedItem = await item.save(); 
        res.json(updatedItem);
    } else {
        res.status(404);
        throw new Error('Item not found');
    }
});
