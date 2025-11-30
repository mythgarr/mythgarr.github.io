class BingoPhrase{
    constructor(text, emoji = '') {
        this.text = text;
        this.emoji = emoji;
    }
}
const FREE_SPACE = new BingoPhrase("FREE\nSPACE");

// COMMON
const commonWords = [
    new BingoPhrase('Romantic song', '\u{1F496}\u{1F3B5}'),
    new BingoPhrase('Santa', '\u{1F385}\u{1F9E5}'),
    new BingoPhrase('Reindeer', '\u{1F98C}\u{1F6F7}'),
    new BingoPhrase('True meaning of Christmas','\u{1F46A}\u{1F64F}'),
    new BingoPhrase('Dog', '\u{1F436}'),
    new BingoPhrase('Wreath','\u{1F33F}'),
    new BingoPhrase('Home for Christmas', '\u{1F3E0}\u{1F384}'),
    new BingoPhrase('Snow', '\u2744'),
    new BingoPhrase('Snowman', '\u26C4'),
    new BingoPhrase('Christmas Tree', '\u{1F384}'),
    new BingoPhrase('Gifts', '\u{1F381}'),
    new BingoPhrase('Bells', '\u{1F514}'),
    new BingoPhrase('"Scrooge" character','\u{1F620}\u{1F4B0}\u274C\u{1F384}'),
    new BingoPhrase('Candy','\u{1F36D}\u{1F36C}'),
    new BingoPhrase('Cookies', '\u{1F36A}'),
    new BingoPhrase('Christmas Lights','\u2728\u{1F3E0}\u2B50'),
    new BingoPhrase('Games', '\u{1F3B2}\u{1F3AE}'),
    new BingoPhrase('Children','\u{1F466}\u{1F467}'),
    new BingoPhrase('Group Meal', '\u{1F46A}\u{1F372}'),
    new BingoPhrase('Carols', '\u{1F3B5}'),
    new BingoPhrase('Shopping', '\u{1F6CD}'),
    new BingoPhrase('Christmas Eve', '\u{1F384}\u{1F303}'),
    new BingoPhrase('Musical Instrument', '\u{1F3B5}\u{1F3BB}'),
];

// UNCOMMON
const uncommonWords = [
    new BingoPhrase('Ice skating','\u26F8'),
    new BingoPhrase('Slipping/Tripping', '\u26F8\u{1F628}\u{1F915}'),
    new BingoPhrase('Role Model','\u{1F44F}\u{1F468}\u200D\u{1F467}\u{1F466}'),
    new BingoPhrase('Christmas Wish', '\u{1F384}\u{1F64F}\u2728'),
    new BingoPhrase('Dysfunctional family','\u{1F620}\u{1F468}\u200D\u{1F467}\u{1F466}\u{1F494}'),
    new BingoPhrase('Catching somebody'),
    new BingoPhrase('Competition', '\u{1F3C5}\u{1F3C6}'),
    new BingoPhrase('All Work, No Play','\u{1F4BC}\u{1F614}'),
    new BingoPhrase('Elves', '\u{1F9DD}'),
    new BingoPhrase('Christmas List', '\u2705'),
    new BingoPhrase('Flashback','\u{1F4AD}\u{1F570}'),
    new BingoPhrase('Learn to love Christmas'),
    new BingoPhrase('Poinsettia'),
    new BingoPhrase('Coffee/Cocoa', '\u2744'),
    new BingoPhrase('Choreography','\u{1F483}\u{1F57A}\u{1F3B6}'),
    new BingoPhrase('Christmas Pun','\u{1F0CF}'),
    new BingoPhrase('Extended Family','\u{1F46A}\u{1F475}'),
];

// RARE
const rareWords = [
    new BingoPhrase('Mistletoe', '\u{1F33F}\u{1F48B}'),
    new BingoPhrase('Office Romance', '\u{1F468}\u{200D}\u{1F4BC}\u{1F495}\u{1F469}\u{200d}\u{1F4BC}'),
    new BingoPhrase('White Christmas', '\u{1F90D}\u2744\u{1F384}'),
    new BingoPhrase('Nearly hit by vehicle', '\u{1F631}\u26A0\u{1F697}'),
    new BingoPhrase('Ghosts','\u{1F47B}'),
    new BingoPhrase('Christmas obsession', '\u{1F606}\u{1F384}'),
    new BingoPhrase('Big City meets Small Town','\u{1F3D9}\u2708\u{1F3E0}'),
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

function populate(board, wordList) {
    const size = board.length;
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
}
 
class RandomBucketStrategy {
    COMMON_PERC = 0.75;
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
        // Calculate desired counts using ceiling to guarantee at least the requested share,
        // then adjust so the total does not exceed WORD_COUNT.
        let desiredCommon = Math.ceil(WORD_COUNT * this.COMMON_PERC);
        let desiredUncommon = Math.ceil(WORD_COUNT * this.UNCOMMON_PERC);

        // If the sum exceeds WORD_COUNT, reduce uncommon first, then common.
        let overflow = desiredCommon + desiredUncommon - WORD_COUNT;
        if (overflow > 0) {
            const reduceUncommon = Math.min(desiredUncommon, overflow);
            desiredUncommon -= reduceUncommon;
            overflow -= reduceUncommon;
            if (overflow > 0) {
                desiredCommon -= Math.min(desiredCommon, overflow);
                overflow = 0;
            }
        }

        // Respect available pool sizes.
        const actualCommon = Math.min(desiredCommon, this.common.length);
        const actualUncommon = Math.min(desiredUncommon, this.uncommon.length);

        let wordList = this.common.slice(0, actualCommon)
            .concat(this.uncommon.slice(0, actualUncommon));

        // Fill the remainder from rare first as specified.
        let remaining = WORD_COUNT - wordList.length;
        if (remaining > 0) {
            const takeRare = Math.min(remaining, this.rare.length);
            wordList = wordList.concat(this.rare.slice(0, takeRare));
            remaining -= takeRare;
        }

        // If rare pool is insufficient (or earlier pools were short),
        // fall back to unused items from the other pools to fill up.
        if (remaining > 0) {
            const uncommonRemainder = this.uncommon.slice(actualUncommon);
            const takeUncommon = Math.min(remaining, uncommonRemainder.length);
            wordList = wordList.concat(uncommonRemainder.slice(0, takeUncommon));
            remaining -= takeUncommon;
        }
        if (remaining > 0) {
            const commonRemainder = this.common.slice(actualCommon);
            const takeCommon = Math.min(remaining, commonRemainder.length);
            wordList = wordList.concat(commonRemainder.slice(0, takeCommon));
            remaining -= takeCommon;
        }

        shuffle(wordList);
        const board = new Array(size);
        populate(board, wordList);
        return board;
    }
}
