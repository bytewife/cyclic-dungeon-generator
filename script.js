// SOCIAL NETWORK GENERATION
const num_people = 10;
const rel_types = ["friend", "lover", "enemy"];

let social_edges = [];

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
let dot_fragments = [];
for (let obj of social_edges) {
  let {src, dst, label} = obj;
  dot_fragments.push(` ${src} -> ${dst} [label="${label}"]`);
}

let dot = "digraph {\n" + (dot_fragments.join("\n")) + "\n}\n";


// Asynchronous call to layout
hpccWasm.graphviz.layout(dot, "svg", "dot").then(svg => {
    const div = document.getElementById("placeholder");
    div.innerHTML = svg;
});

// hpccWasm.graphvizSync().then(graphviz => {
//     const div = document.getElementById("placeholder2");
//     // Synchronous call to layout
//     div.innerHTML = graphviz.layout(dot, "svg", "dot");
// });
