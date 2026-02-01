// services/searchService.js
class TrieNode {
    constructor() {
        this.children = {};
        this.isEndOfWord = false;
        this.novels = []; // Store basic info like {id, title, cover}
    }
}

class SearchTrie {
    constructor() {
        this.root = new TrieNode();
    }

    insert(title, novelInfo) {
        let node = this.root;
        const word = title.toLowerCase();
        for (const char of word) {
            if (!node.children[char]) node.children[char] = new TrieNode();
            node = node.children[char];
        }
        node.isEndOfWord = true;
        // Store info to avoid a second DB lookup
        node.novels.push(novelInfo);
    }

    suggest(prefix) {
        let node = this.root;
        for (const char of prefix.toLowerCase()) {
            if (!node.children[char]) return [];
            node = node.children[char];
        }
        return this.collectAll(node).slice(0, 10); // Return top 10 results
    }

    collectAll(node, results = []) {
        if (node.isEndOfWord) results.push(...node.novels);
        for (const char in node.children) {
            this.collectAll(node.children[char], results);
        }
        return results;
    }
}

// Export a single instance (Singleton)
export const novelSearchTrie = new SearchTrie();