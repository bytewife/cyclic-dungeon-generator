// SOCIAL NETWORK GENERATION
const num_people = 10;
const rel_types = ["friend", "lover", "enemy"];
let seed;
let dot;
let dot_fragments = [];
let text_lines = [];
let arrow = '->'
let regex_alphanum = /^[A-Za-z0-9]+$/

let social_edges = [];

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

function fillGrid(text = "Hero -> Dragon : Fights\nDragon -> Treasure : Guards") {
    select("#asciiBox").value(text);
    text_lines.push(text)
}

function parseTextForm() {
    text_lines = splitByNewline(select("#asciiBox").value());
    // print(text_lines)
    // print(checkIsArrow(text_lines[0]))
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
    social_edges = []
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
    if (is_valid_rule) social_edges.push({
        src: src,
        dst: dst,
        label: label
    });

    // CONVERTION TO DOT LANGUAGE
    for (let obj of social_edges) {
        let { src, dst, label } = obj;
        dot_fragments.push(` ${src} -> ${dst} [label="${label}"]`);
    }
}

function render() {
    dot = "digraph {\n" + (dot_fragments.join("\n")) + "\n}\n";

    // Asynchronous call to layout
    hpccWasm.graphviz.layout(dot, "svg", "dot").then(svg => {
        const div = document.getElementById("canvasContainer");
        div.innerHTML = svg;
    });
    dot_fragments = []


    // hpccWasm.graphvizSync().then(graphviz => {
    //     const div = document.getElementById("placeholder2");
    //     // Synchronous call to layout
    //     div.innerHTML = graphviz.layout(dot, "svg", "dot");
    // });
}

