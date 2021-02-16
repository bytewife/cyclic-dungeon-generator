// TODO
// Add a key mechanism (in the label or other)
// Add more modular key-adding structure that uses a dict to store rule regexs with the functions
// https://renenyffenegger.ch/notes/index.html

// Graphviz tools https://renenyffenegger.ch/notes/tools/Graphviz/examples/index
// SOCIAL NETWORK GENERATION
let seed;
let dot;
let dot_fragments = [];
let text_lines = [];
let arrow = '->'
let regex_alphanum = /^[A-Za-z0-9]+$/

let cycleRule = /cycle\((.*?),(.*?),(.*?),(.*?)\)/  // cycle(,,,,) with no white spaces for params
let lockKeyRule = /lock\((.*?),(.*?)\)/
let keyLocks = {}

let social_edges = {};  // Looks like { srcname: {dst:[...], label: [...]}, ... }

function setup() {
    numCols = select("#asciiBox").attribute("rows") | 0; // iot grab html element named asciiBox.
    numRows = select("#asciiBox").attribute("cols") | 0; // 'select()' grabs an html element
    // select("#reseedButton").mousePressed(reseed);
    select("#asciiBox").input(parseTextForm);
    fillGrid();
    parseTextForm()
}

function reseed() {
    seed = (seed | 0) + 1109;
    noiseSeed(seed);
    randomSeed(seed);
    select("#seedReport").html("seed " + seed);
}

function fillGrid(
    text = "Hero -> Dragon : Fights\nDragon -> Treasure : Guards\ncycle(Hero, Foyer, Dragon, Basement)"
) {
    select("#asciiBox").value(text);
    text_lines.push(text)
}

function parseTextForm() {
    text_lines = splitByNewline(select("#asciiBox").value());
    text_lines.forEach(line => { generateDot(line) });
    render();
}

function checkIsArrow(line) {
    let re = new RegExp(arrow)
    if (re.test(line)) {
        let lenCheckArr = line.split(arrow)
        return lenCheckArr[0].trim() != "" && lenCheckArr[1].trim() != ""
    }
}

function splitByNewline(str) {
    let lines = str.split("\n");
    return lines;
}

function generateDot(line) {
    let src, dst, label = "";
    if (checkIsArrow(line)) {
        // GET SRC & DST (->)
        let arr = (line.split(arrow, 2))
        arr[0] = arr[0].replace(/[^0-9A-Za-z ]/, '').trim() ;  // remove non alphanumeric
        arr[1] = arr[1].split(':', 1)[0].replace(/[^0-9A-Za-z ]/, '').trim();  // surroundig quotes for multi word
        // GET LABEL (:)
        if (/:/.test(line)) {
            label = " " + line.split(':', 2)[1].trim();
        }
        src = arr[0], dst = arr[1];
        print(src)
        addEdge(social_edges, src, dst, label);
    }
    else if (cycleRule.test(line)) {
        let c = 4;
        let n = line.split(',',c)
        n[0] = parseParamHead(n[0])
        n[1] = parseParamBody(n[1])
        n[2] = parseParamBody(n[2])
        n[3] = parseParamTail(n[3]);
        if (!n.includes("")) {
            for(let src = 0; src < c;) {
                addEdge(social_edges, n[src], n[++src % 4], '');
            }
        }
    }
    else if (lockKeyRule.test(line)) {
        let c = 2;
        let n = line.split(',',c)
        n[0] = parseParamHead(n)
        n[1] = parseParamTail(n)
        if (!n.includes("")) {
            keyLocks[n[0]] = [n[1]]
        }
    }

}

function addEdge(dict, src, dst, label) {
    if(!dict[src]) {  // CHECk IF DICT KEY-VAL PAIR IS OPEN
        dict[src] = {  
            dst: [dst],
            label: [label]
        };
    }
    else { 
        let idx = dict[src]["dst"].indexOf(dst)
        if (idx == -1) { // PREVENT DUPLICATE EDGES, ALLOW REWRITES
            dict[src]["dst"].push(dst) ;
            dict[src]["label"].push(label);
        }
        else {
            dict[src]["dst"][idx] = dst;
            dict[src]["label"][idx] = label;
        }
    }
}

function parseParamHead(n) {
    n = n.substring(n.lastIndexOf('('), n.length).replace(/[^0-9A-Za-z ]/, '').trim();
    return n;
}

function parseParamBody(n) {
    n = n.replace(/[^0-9A-Za-z ]/, '').trim()
    return n;
}

function parseParamTail(n) {
    n = n.substring(0, n.indexOf(')')).replace(/[^0-9A-Za-z ]/, '').trim();
    return n;
}

function render() {
    for (let src in social_edges) {
        for(let edge = 0; edge < social_edges[src]["dst"].length; edge++) {
            let dst = social_edges[src]["dst"][edge]
            let label = social_edges[src]["label"][edge]
            dot_fragments.push(` "${src}" -> "${dst}" [label="${label}"]`);
        }
    }

    dot = "digraph {\n" + (dot_fragments.join("\n")) + "\n}\n";

    // Asynchronous call to layout
    hpccWasm.graphviz.layout(dot, "svg", "dot").then(svg => {
        const div = document.getElementById("canvasContainer");
        div.innerHTML = svg;
    });
    social_edges = {}
    dot_fragments = []


    // hpccWasm.graphvizSync().then(graphviz => {
    //     const div = document.getElementById("placeholder2");
    //     // Synchronous call to layout
    //     div.innerHTML = graphviz.layout(dot, "svg", "dot");
    // });
}

