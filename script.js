// TODO
// - Figure out how to store the generation rules. Adjacency List? How to get past issue of the key room being unreachable- I think you need to make it so that each rule has one node that's in-use (like a hook)
// - add generation rule of every generation needs a start, and a goal
// 
// https://renenyffenegger.ch/notes/index.html

// Graphviz tools https://renenyffenegger.ch/notes/tools/Graphviz/examples/index
// SOCIAL NETWORK GENERATION
let seed;
let dot;
let dot_fragments = [];
let text_lines = [];
// let alphanum = /^[A-Za-z0-9]+$/
let alphanum = /[^0-9A-Za-z ]/  // actually this is non alphanum

let rules_dict = {
    arrow: {
        regex: /->/,
        args: 2,
        function: arrow,
        template: (arr) => { return `${arr[0]} -> ${arr[1]}`; },
        weight: 40
    },
    cycle: {
        regex: /cycle\((.+?),(.+?)((,(.+?))*)\)/, // cycle(,,,,) with no white spaces for params
        args: -1,
        function: cycle, 
        template: (arr) => {
            if(arr.length == 0) return "";
            let ret = 'cycle('
            ret += `${arr[0]}`
            for(let i=1; i < arr.length;++i) {
                ret += `, ${arr[i]}`
            }
            ret += `)`
            return ret;
        },
        weight: 20

    },
    keylock: {
        regex: /keylock\((.*?),(.*?),(.*?)\)/,  // keylock(keylocation, start, end)
        args: 3,
        function: keylock,
        template: (arr) => {
            if(arr.length != 3) return "";
            let ret = 'keylock('
            ret += `${arr[0]}`
            for(let i=1; i < arr.length;++i) {
                ret += `, ${arr[i]}`
            }
            ret += `)`
            return ret;
        },
        weight: 20
    },
    wedge: {
        regex: /wedge\((.*?),(.*?),(.*?)\)/,  // wedge(start, middle, end)
        args: 3,
        function: wedge,  
        template: (arr) => {
            if(arr.length != 3) return "";
            let ret = 'wedge('
            ret += `${arr[0]}`
            for(let i=1; i < arr.length;++i) {
                ret += `, ${arr[i]}`
            }
            ret += `)`
            return ret;
        },
        weight: 30
    }
}

let keyLocks = {}     // key: key area, value: [door area, locked area]
let lockedEdges = {}; // key: door area, value: [locked area, key area]

let social_edges = {};  // Looks like { srcname: {dst:[...], label: [...]}, ... }

function setup() {
    // reseed();
    numCols = select("#asciiBox").attribute("rows") | 0; // iot grab html element named asciiBox.
    numRows = select("#asciiBox").attribute("cols") | 0; // 'select()' grabs an html element
    select("#reseedButton").mousePressed(reseed);
    select("#asciiBox").input(parseTextForm);
    fillTextForm();
    parseTextForm()
    
}

function reseed() {
    seed = random(seed) + random(600, 1109);
    noiseSeed(seed);
    randomSeed(seed);
    select("#seedReport").html(" seed: " + seed);
    inputText = generateText(4);
    fillTextForm();
    parseTextForm();
}

let inputText = '\
Hero -> Village : Sidle back\n\
Dragon -> Treasure : Guards\n\
cycle(Hero, Cave, Dragon, Basement)\n\
keylock(Basement, Hero, Treasure)\n\
wedge(Hero:Duels, Rival, Cave)\
';
function fillTextForm(
    text = ""
) {
    select("#asciiBox").value(text = inputText);
}

function parseTextForm() {
    text_lines = select("#asciiBox").value().split("\n");
    text_lines.forEach(line => { generateDot(line) });
    render();
}

function generateDot(line) {
    if (line && line[0] == '#') return; // TODO split line by # instead
    for(const [tag, details] of Object.entries(rules_dict)) {
        if(details["regex"].test(line)) {
            details["function"](line);
        }
    }
}

let wordPool = ["Cave", "Home", "Dark Castle", "Woods", "River", "Treasure"]
function generateText(amt) {
    let ret = '';
    let keys = Object.keys(rules_dict);
    let len = keys.length
    let keyLocations = {}
    let lockLocations = {}
    let tries = 0;

    let weight_sum = 0;
    for (rule in rules_dict) {
        weight_sum += rules_dict[rule]["weight"];
    }

    let idx;
    let keep_idx = false;
    let key;
    for(let line=0; line<amt; ++line) {
        if (tries > 100) { print("ran out of tries"); return;}

        if(!keep_idx){
            idx = random(0, len) | 0;
            for(let sum = 0, weight = 0; sum < weight_sum; idx = idx++ % (len)) {
                key = keys[idx]
                weight += rules_dict[key]["weight"]
                if(weight > weight_sum) break;
            }
        }
        keep_idx = false;
        let args = []
        let argc = rules_dict[key]["args"]
        argc = argc == -1 ? random(3,6) | 0 : argc;
        let redo = false;
        for (let word=0, lim = 0, seen = {}; word < argc; lim++) {
            if(lim > 50) { redo = true; break; } 
            let w = random(0, wordPool.length) | 0;
            let n = wordPool[w]
            if(n in seen) continue;
            seen[n] = true;
            args.push(n)
            ++word
        }
        // Generation rules
        ++tries;
        if (redo) continue;
        if(key == 'keylock') {
            if(args[0] in keyLocations ||
               (args[1] in lockLocations) && lockLocations[args[1]].indexOf(args[2]) != -1
               ||
               (args[0] == args[2] || args[0] == args[1] || args[1] == args[2])// Self-reference: key leads to key-room
            ) {
                --line; print("redo"); keep_idx = true; continue; }  // Duplicate Key Area
            else {
                keyLocations[args[0]] = true;
                if(!lockLocations[args[1]]) lockLocations[args[1]] = []
                lockLocations[args[1]].push(args[2])
            }
        }

        ret += rules_dict[key]["template"](args) + "\n"
    }
    return ret;
}

function arrow(line) {
    let src, dst, label = ""
    let arr = (line.split("->", 2))
    if(arr[0].trim() == "" || arr[1].trim() == "") return;
    arr[0] = arr[0].replace(alphanum, '').trim() ;  // remove non alphanumeric
    arr[1] = arr[1].split(':', 1)[0].replace(alphanum, '').trim();  // surroundig quotes for multi word
    if (/:/.test(line)) {
        label = " " + line.split(':', 2)[1].trim();
    }
    src = arr[0], dst = arr[1];
    addEdge(social_edges, src, dst, label);
}

function cycle(line) {
    let c = 4
    let n = line.split(',')
    let len = n.length;
    n[0] = parseParamHead(n[0]);
    for(let i = 1; i < len-1; ++i) {
        n[i] = parseParamBody(n[i]);
    }
    n[len-1] = parseParamBody(n[len-1]);
    if (!n.includes("")) {
        for(let src = 0; src < len; ++src) {
            addEdge(social_edges, n[src][0], n[(src+1) % len][0], n[src][1]);
        }
    }
}

function keylock(line) {
    let c = 3;
    let n = line.split(',',c)
    n[0] = parseParamHead(n[0])
    n[1] = parseParamBody(n[1])
    n[2] = parseParamTail(n[2])
    if (!n.includes("")) {
        if(!keyLocks[n[0][0]]) keyLocks[n[0][0]] = []
        keyLocks[n[0][0]].push([n[1][0], n[2][0]])

        if(!lockedEdges[n[1][0]]) lockedEdges[n[1][0]] = []
        // lockedEdges[n[1][0]].push([n[2][0]]);
        lockedEdges[n[1][0]].push([n[2][0], n[0][0]]);

        addEdge(social_edges, n[0][0], n[1][0], n[0][1]);
        addEdge(social_edges, n[1][0], n[2][0], n[1][1]); // make this one transparent ofr now
    }
}

function wedge(line) {
    let c = 3;
    let n = line.split(',',c)
    n[0] = parseParamHead(n[0])
    n[1] = parseParamBody(n[1])
    n[2] = parseParamTail(n[2])

    let start = n[0][0]
    let end = n[2][0]
    removeEdge(social_edges, start, end)
    let middle = n[1][0]
    if (!n.includes("")) {
        addEdge(social_edges, start, middle, n[0][1]);
        addEdge(social_edges, middle, end, n[1][1]); // make this one transparent ofr now
    }
}

function removeEdge(dict, src, dst) {
    let dict_val = dict[src]
    if(!dict_val) return;
    let lookup_arr = dict_val["dst"]
    if(lookup_arr && lookup_arr.indexOf(dst) != -1) {  // Check if edge is in given location
        let idx = lookup_arr.indexOf(dst)
        lookup_arr.splice(idx, 1);
        let label_arr = dict_val["label"]
        label_arr.splice(idx, 1);
        if(lookup_arr.length < 1) delete dict_val
        // TODO remove from keyLocks
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

// These parse functions return n, where n[0] is the node name and n[1] is the label/verb
function parseParamHead(n) {
    n = n.substring(n.lastIndexOf('('), n.length).replace(alphanum, '').split(':', 2);
    if (!n[1]) n[1] = ""
    return [n[0].trim(), n[1].trim()];
}

function parseParamBody(n) {
    n = n.split(':', 2);
    if (!n[1]) n[1] = ""
    return [n[0].replace(alphanum, '').trim(), n[1].replace(alphanum, '').trim()];
}

function parseParamTail(n) {
    n = n.substring(0, n.indexOf(')')).replace(alphanum, '').split(':', 2);
    if (!n[1]) n[1] = ""
    return [n[0].trim(), n[1].trim()];
}

function render() {
    for (let src in social_edges) {
        for(let edge = 0; edge < social_edges[src]["dst"].length; edge++) {
            let keyUni = '\u26B7 ' // more http://www.unicode.org/charts/PDF/U2600.pdf
            let dst = social_edges[src]["dst"][edge]
            let edgecol = ""
            let keycol = ""

            let label = social_edges[src]["label"][edge]

            let ks = ''; if (src in keyLocks) { ks = keyUni; keycol = hashStringToColor(src); }  // If this src has a key
            let kd = ''; if (dst in keyLocks) { kd = keyUni; }  // just adds key character to pointed-to node

            let sty = ""
            if (src in lockedEdges) { // If this edge is a key-lock edge
                for(let a=0; a<lockedEdges[src].length; a++) {  // search through each lock edge using as a door
                    if(lockedEdges[src][a][0] == dst) {
                        sty = "dashed"; edgecol = hashStringToColor(lockedEdges[src][a][1]);  // hash the key location
                        break;
                    }
                }
            }

            dot_fragments.push(` "${ks}${src}" -> "${kd}${dst}" [label="${label}" style="${sty}" color="${edgecol}"]`);
            if (ks != '') {
                dot_fragments.push(` "${ks}${src}" [ fillcolor="${keycol}"   style=filled]`);  // Changes node color if it contains key
            }
        }
    }

    dot = "digraph {\n" + (dot_fragments.join("\n")) + "\n}\n";

    // Asynchronous call to layout
    hpccWasm.graphviz.layout(dot, "svg", "dot").then(svg => {
        const div = document.getElementById("canvasContainer");
        div.innerHTML = svg;
    });

    // RESETTI
    social_edges = {}
    dot_fragments = []
    for (let prop in keyLocks) {
        delete keyLocks[prop];
    }
    for (let prop in lockedEdges) {
        delete lockedEdges[prop];
    }

    // hpccWasm.graphvizSync().then(graphviz => {
    //     const div = document.getElementById("placeholder2");
    //     // Synchronous call to layout
    //     div.innerHTML = graphviz.layout(dot, "svg", "dot");
    // });
}



// For converting string to color https://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
function hashStringToColor(str) { 
    let h = noise(hashfunc(str, false, 0));
    let s = 0.800;
    let v = 0.999
    let ret = ""+h+ " "+s+" "+v
    return ret
}

function hashfunc(str, asString, seed) {
    /*jshint bitwise:false */
    var i, l, hval = (seed === undefined) ? 0x811c9dc5 : seed;
    for (i = 0, l = str.length; i < l; i++) {
        hval ^= str.charCodeAt(i);
        hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    } if( asString ){
        // Convert to 8 digit hex string
        return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
    } return hval >>> 0;
}
