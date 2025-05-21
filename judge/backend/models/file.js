    import mongoose from 'mongoose';
    import { v4 as uuidv4 } from 'uuid';

    const UserSchema = new mongoose.Schema({
        uniqueId:{
            type: String,
            default: ()=>uuidv4(),
            unique: true
        },
        name:{
            type: String,
            required: true
        },
        handle:{
            type: String,
            required: true,
            unique: true
        },
        email:{
            type: String,
            required: true,
            unique: true,
        },
        phone:{
            type: String,
            required: true,
        },
        password:{
            type: String,
            required: true,
        }
    });

    const User = mongoose.model('User',UserSchema);

    
    export default User;