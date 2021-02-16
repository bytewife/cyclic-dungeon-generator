// SOCIAL NETWORK GENERATION
const num_people = 10;
const rel_types = ["friend", "lover", "enemy"];
let seed;
let dot;
let dot_fragments = [];
let text_lines = [];
let arrow = '->'
let regex_alphanum = /^[A-Za-z0-9]+$/
// let cycleRule = /cycle\(,{3}\)/
let cycleRule = /cycle\((.*?),(.*?),(.*?),(.*?)\)/

let social_edges = {};  // Looks like { srcname: {dst:[...], label: [...]}, ... }

function setup() {
    numCols = select("#asciiBox").attribute("rows") | 0; // iot grab html element named asciiBox.
    numRows = select("#asciiBox").attribute("cols") | 0; // 'select()' grabs an html element
    select("#reseedButton").mousePressed(reseed);
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

function gridToString(grid) {
    let rows = [];
    for (let i = 0; i < grid.length; i++) {
        rows.push(grid[i].join(""));
    }
    return rows.join("\n");
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
    let is_valid_rule = false;
    if (checkIsArrow(line)) {
        // GET SRC & DST (->)
        let arr = (line.split(arrow, 2))
        arr[0] = '"' + arr[0].replace(/[^0-9A-Za-z ]/, '').trim() + '"';  // remove non alphanumeric
        arr[1] = '"' + arr[1].split(':', 1)[0].replace(/[^0-9A-Za-z ]/, '').trim() + '"';  // surroundig quotes for multi word

        // GET LABEL (:)
        if (/:/.test(line)) {
            label = " " + line.split(':', 2)[1].trim();
        }
        src = arr[0], dst = arr[1];
        is_valid_rule = true;
    }
    else if (cycleRule.test(line)) {
        let n = line.split(',',4)
        n[0] = n[0].substring(n[0].lastIndexOf('('), n[0].length).replace(/[^0-9A-Za-z ]/, '').trim();
        n[1] = n[1].replace(/[^0-9A-Za-z ]/, '').trim();
        n[2] = n[2].replace(/[^0-9A-Za-z ]/, '').trim();
        n[3] = n[3].substring(0, n[3].indexOf(')')).replace(/[^0-9A-Za-z ]/, '').trim();
        print(n)
        if (!n.includes("")) {
            for(let src = 0; src < 4;) {
                addEdge(social_edges, n[src], n[++src % 4], "");
            }
        }
        // add an edge from a to b to c to d
    }
    if (is_valid_rule) addEdge(social_edges, src, dst, label);
    // CONVERTION TO DOT LANGUAGE
}

function addEdge(dict, src, dst, label) {
    if(!dict[src]) {
        dict[src] = {  // check if dst has items already
            dst: [dst],
            label: [label]
        };
    }
    else { // IF IT ALREADY EXISTS IN DICT, APPEND EDGE 
        dict[src]["dst"].push(dst) ;
        dict[src]["label"].push(label);
    }
}

function render() {
    for (let src in social_edges) {
        for(let edge = 0; edge < social_edges[src]["dst"].length; edge++) {
            let dst = social_edges[src]["dst"][edge]
            let label = social_edges[src]["label"][edge]
            dot_fragments.push(` ${src} -> ${dst} [label="${label}"]`);
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

