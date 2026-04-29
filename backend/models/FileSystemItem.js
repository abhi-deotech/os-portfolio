import mongoose from 'mongoose';

const fileSystemItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a file or folder name'],
        trim: true
    },
    type: {
        type: String,
        enum: ['file', 'folder'],
        required: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FileSystemItem',
        default: null // null means it's in the root directory
    },
    content: {
        type: String,
        default: '' // Text content if it's a text file
    },
    size: {
        type: Number,
        default: 0
    },
    path: {
        type: String,
    }
}, {
    timestamps: true 
});

// ---- CORE MONGOOSE HOOKS ----

// Pre-save hook: Automatically calculate file size and path before saving to DB
fileSystemItemSchema.pre('save', async function(next) {
    // 1. Calculate Size
    if (this.type === 'file' && this.isModified('content')) {
        // Buffer.byteLength gets the actual byte size of the string
        this.size = Buffer.byteLength(this.content || '', 'utf8');
    } else if (this.type === 'folder') {
        this.size = 0;
    }

    // 2. Calculate Path
    if (!this.parentId) {
        this.path = `/${this.name}`;
    } else if (this.isModified('parentId') || this.isModified('name')) {
        // If it's inside a folder, find the parent folder to construct the full path dynamically
        const parent = await mongoose.model('FileSystemItem').findById(this.parentId);
        if (parent) {
            this.path = `${parent.path === '/' ? '' : parent.path}/${this.name}`;
        } else {
            this.path = `/${this.name}`;
        }
    }

    next();
});

const FileSystemItem = mongoose.model('FileSystemItem', fileSystemItemSchema);

export default FileSystemItem;
