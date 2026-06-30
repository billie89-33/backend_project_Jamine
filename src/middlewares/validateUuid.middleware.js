export const validateUuid = (req, res, next) => {
    const id = req.params.id;
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    
    if (id && !uuidRegex.test(id)) {
        return res.status(400).json({ success: false, message: 'Invalid ID format (must be UUID)' });
    }
    
    next();
};
