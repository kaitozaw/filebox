class StorageStrategy {
    async save(params) {
        throw new Error('StorageStrategy.save() not implemented');
    }

    stream(filePath) {
        throw new Error('StorageStrategy.stream() not implemented');
    }

    async remove(filePath) {
        throw new Error('StorageStrategy.remove() not implemented');
    }
}

module.exports = StorageStrategy;