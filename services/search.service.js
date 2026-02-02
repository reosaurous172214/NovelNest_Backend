// services/searchService.js
class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
        this.novels = []; // Store basic info like {id, title, cover}
    }
}
// services/searchService.js

class SearchTrie {
    constructor() {
        this.root = new TrieNode();
    }

    // You were calling this in your controller, but it wasn't defined!
    reset() {
        this.root = new TrieNode();
    }

    insert(title, novelInfo) {
        let node = this.root;
        const word = title.toLowerCase().trim(); // Trim whitespace
        for (const char of word) {
            if (!node.children[char]) node.children[char] = new TrieNode();
            node = node.children[char];
        }
        node.isEndOfWord = true;

        // Check for duplicates before pushing to prevent identical IDs in the same node
        const exists = node.novels.find(n => n.id.toString() === novelInfo.id.toString());
        if (!exists) {
            node.novels.push(novelInfo);
        }
    }

    suggest(prefix) {
        let node = this.root;
        for (const char of prefix.toLowerCase()) {
            if (!node.children[char]) return [];
            node = node.children[char];
        }
        
        // Use a Set or a Map to ensure global uniqueness across the entire branch
        const uniqueResults = new Map();
        this.collectAll(node, uniqueResults);
        
        return Array.from(uniqueResults.values()).slice(0, 10);
    }

    collectAll(node, uniqueMap) {
        if (node.isEndOfWord) {
            node.novels.forEach(novel => {
                // Keying by ID ensures no duplicates even if found via different paths
                uniqueMap.set(novel.id.toString(), novel);
            });
        }
        for (const char in node.children) {
            this.collectAll(node.children[char], uniqueMap);
        }
    }
}
export const novelSearchTrie = new SearchTrie();