import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { USER_ROLES } from '../constants/index.js';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please add a username'],
        unique: true,
        trim: true
    },
    name: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        default: null
    },
    avatar: {
        public_id: { type: String, default: null },
        url: { type: String, default: null }
    },
    role: {
        type: String,
        enum: Object.values(USER_ROLES),
        default: USER_ROLES.USER
    },
    status: {
        type: String,
        enum: ['active', 'banned'],
        default: 'active'
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false 
    },
    addresses: [
        {
            fullName: { type: String, required: true },
            phone: { type: String, required: true },
            address: { type: String, required: true },
            province: { type: String, required: true },
            district: { type: String, required: true },
            subDistrict: { type: String, required: true },
            postalCode: { type: String, required: true },
            isDefault: { type: Boolean, default: false }
        }
    ]
}, {
    timestamps: true,
    toJSON: {
        transform(doc, ret) {
            delete ret.password;
            return ret;
        }
    },
    toObject: {
        transform(doc, ret) {
            delete ret.password;
            return ret;
        }
    }
});

// Hash password ก่อน save
userSchema.pre('save', async function() {
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method สำหรับเช็ค password
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
