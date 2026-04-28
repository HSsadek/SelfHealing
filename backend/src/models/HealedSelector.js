const mongoose = require('mongoose');

let HealedSelectorModel = null;
const memoryStore = new Map(); // In-memory fallback

try {
    const schema = new mongoose.Schema({
        oldSelector: { type: String, required: true },
        newSelector: { type: String, required: true },
        successRate: { type: Number, default: 100 },
        action: { type: String },
        lastUsed: { type: Date, default: Date.now }
    });
    // This allows it to work without erroring out if connection fails late
    HealedSelectorModel = mongoose.model('HealedSelector', schema);
} catch (e) {
    console.warn('[SmartMemory] Mongoose schema compilation skipped');
}

/**
 * Universal wrapper abstracting Mongoose vs In-Memory dictionary 
 */
const SmartMemory = {
    connect: async () => {
        try {
            await mongoose.connect('mongodb://localhost:27017/kalitedb', {
                serverSelectionTimeoutMS: 2000
            });
            console.log('[SmartMemory] MongoDB connected successfully.');
            SmartMemory.isDbMode = true;
        } catch (e) {
            console.warn('[SmartMemory] MongoDB connection failed. Falling back to in-memory mode.', e.message);
            SmartMemory.isDbMode = false;
        }
    },
    
    saveFix: async (oldSelector, newSelector, action) => {
        if (SmartMemory.isDbMode && HealedSelectorModel) {
            await HealedSelectorModel.findOneAndUpdate(
                { oldSelector, action },
                { newSelector, $inc: { successRate: 1 }, lastUsed: new Date() },
                { upsert: true, new: true }
            );
        } else {
            const key = `${action}_${oldSelector}`;
            memoryStore.set(key, { newSelector, successRate: 1 });
        }
    },

    getFix: async (oldSelector, action) => {
        if (SmartMemory.isDbMode && HealedSelectorModel) {
            const doc = await HealedSelectorModel.findOne({ oldSelector, action }).sort('-successRate');
            return doc ? doc.newSelector : null;
        } else {
            const key = `${action}_${oldSelector}`;
            const fix = memoryStore.get(key);
            return fix ? fix.newSelector : null;
        }
    }
};

module.exports = SmartMemory;
