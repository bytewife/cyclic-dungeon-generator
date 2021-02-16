// SOCIAL NETWORK GENERATION
const num_people = 10;
const rel_types = ["friend", "lover", "enemy"];
let seed;
let dot;
let dot_fragments = [];

let social_edges = [];

function setup() {
  numCols = select("#asciiBox").attribute("rows") | 0; // iot grab html element named asciiBox.
  numRows = select("#asciiBox").attribute("cols") | 0; // 'select()' grabs an html element
  select("#reseedButton").mousePressed(reseed);
  select("#asciiBox").input(reparseGrid); // iot run reparseGrid as a callback to asciiBox's input being changed
  generateDot()
  render()
}

function reseed() {
  seed = (seed | 0) + 1109;
  noiseSeed(seed);
  randomSeed(seed);
  select("#seedReport").html("seed " + seed);
}

function regenerateGrid() {
  select("#asciiBox").value(gridToString(generateGrid(numCols, numRows)));
  reparseGrid();
}

function reparseGrid() {
    print(stringToGrid(select("#asciiBox").value()));
}

function gridToString(grid) {
  let rows = [];
  for (let i = 0; i < grid.length; i++) {
    rows.push(grid[i].join(""));
  }
  return rows.join("\n");
}

function stringToGrid(str) {
  let grid = [];
  let lines = str.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let row = [];
    let chars = lines[i].split("");
    for (let j = 0; j < chars.length; j++) {
      row.push(chars[j]);
    }
    grid.push(row);
  }
  return grid;
}

function generateDot() {
    for (let i = 0; i < num_people; i++) {
        for (let j = 0; j < num_people; j++) {
            if (Math.random() < 0.1) {
                let rel = rel_types[Math.floor(Math.random() * rel_types.length)];
                social_edges.push({
                    src: i,
                    dst: j,
                    label: rel
                });
            }
        }
    }

    // CONVERTION TO DOT LANGUAGE
    for (let obj of social_edges) {
        let {src, dst, label} = obj;
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
}

render();

// hpccWasm.graphvizSync().then(graphviz => {
//     const div = document.getElementById("placeholder2");
//     // Synchronous call to layout
//     div.innerHTML = graphviz.layout(dot, "svg", "dot");
// });
