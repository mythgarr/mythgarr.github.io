const FREE_SPACE = "FREE\nSPACE";
const ENABLE_EMOJI = false;

function make_phrase(text, emoji) {
    return ENABLE_EMOJI
        ? `${emoji} ${text} ${emoji}`
        : text;
}

// COMMON
const commonWords =[
    'Romantic song',
    'Snowman',
    'Song about Santa',
    'Reindeer',
    'The true meaning of Christmas',
    'Dog',
    'Wreath',
    'Home for Christmas',
    'Snow',
    'Christmas Tree',
    make_phrase('Bells', ' \uD83D\uDD14'),
    '"Scrooge" character',
    'Gifts',
    'Candy Cane',
    'Cookies',
    'Santa Suit',
    'Christmas Lights',
    'Games',
    'Children',
    'Family Meal',
    'Carols',
    'Shopping',
];

// UNCOMMON
const uncommonWords = [
    'Ice skating',
    'Slipping on ice',
    'Inspired by parent',
    'Christmas wish',
    'Dysfunctional family',
    'Catching somebody',
    'Big Competition',
    'All Work, No Play',
    'Elves',
    'Mall Santa',
    'Mistletoe',
    'Flashback',
    'Learn to love Christmas',
    'Poinsettia',
    'Hot cocoa',
];

// RARE
const rareWords = [
    'Inappropriate love interest',
    'Spontaneous choreography',
    'White Christmas',
    'Nearly hit by vehicle',
    'Ghosts',
    'Christmas obsession',
    'Big City in Small Town',
];

function shuffle(array) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {

        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
}

class RandomStrategy {
    constructor(wordList) {
        this.wordList = wordList
    }

    generate(size) {
        shuffle(this.wordList);

        const board = new Array(size);
        let i = 0;
        for (let x = 0; x < size; x++) {
            board[x] = new Array(size);
            for (let y = 0; y < size; y++) {
                board[x][y] = this.wordList[i++];
            }
        }
        
        if (size % 2 === 1) {
            const mid = (size - 1) / 2;
            board[mid][mid] = FREE_SPACE;
        }
        
        return board;
    }
}

// Phrases 
class RandomBucketStrategy{
    COMMON_PERC = 0.70;
    UNCOMMON_PERC = 0.20;
    
    constructor(common, uncommon, rare) {
        this.common = common
        this.uncommon = uncommon
        this.rare = rare
    }

    generate(size) {
        shuffle(this.common);
        shuffle(this.uncommon);
        shuffle(this.rare);
        const WORD_COUNT = size * size - 1;
        
        let wordList = this.common.slice(0, Math.floor(WORD_COUNT * this.COMMON_PERC))
            .concat(this.uncommon.slice(0, Math.floor(WORD_COUNT * this.UNCOMMON_PERC)));
        wordList = wordList.concat(this.rare.slice(0, WORD_COUNT - wordList.length));
        const board = new Array(size);
        const mid = (size - 1) / 2;
        let i = 0;
        for (let x = 0; x < size; x++) {
            board[x] = new Array(size);
            for (let y = 0; y < size; y++) {
                board[x][y] = x === y && x === mid
                    ? FREE_SPACE
                    : wordList[i++];
            }
        }

        return board;
    }
}
