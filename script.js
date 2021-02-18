// TODO
// clean up rules
// - fix regen button
// - add a changeable "max keylocks"
// - graph traversal until homa can be reached
// - add generation rule of every generation needs a start, and a goal
// - how can I write a grammar that's cleaner?
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
        weight: 30,
        insert_open_pos: [0],
        unseen_to_open_pos: [1]
    },
    cycle: {
        regex: /cycle\((.+?),(.+?)((,(.+?))*)\)/, // cycle(,,,,) with no white spaces for params
        args: 4,  // but user can input as many as they'd like
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
        weight: 20,
        open_pos: 0,
        insert_open_pos: [0],
        unseen_to_open_pos: [1, 3]
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
        weight: 20,
        insert_open_pos: [1],
        unseen_to_open_pos: [0]
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
        weight: 30,
        insert_open_pos: [0],
        unseen_to_open_pos: [1]  // aka expansion slots
    }
}

let keyLocks = {}     // key: key area, value: [door area, locked area]
let lockedEdges = {}; // key: door area, value: [locked area, key area]

let social_edges = {};  // Looks like { srcname: {dst:[...], label: [...]}, keylock_partners: [key, start, end], cameFroms, goingTos }


let wordPool = []; //= ["Cave", "Dark Castle", "Woods", "River", "Forest", "Volcano"]
let open = []; //= ["Home"]
let unseen = []; // = wordPool.filter(function(x) { return open.indexOf(x) < 0 })  // not fast but its readable
let closed; // = ["Treasure"]
function setup() {
    // reseed();
    numCols = select("#asciiBox").attribute("rows") | 0; // iot grab html element named asciiBox.
    numRows = select("#asciiBox").attribute("cols") | 0; // 'select()' grabs an html element
    select("#reseedButton").mousePressed(reseed);
    select("#appendButton").mousePressed(appendText);
    select("#asciiBox").input(parseTextForm);
    fillTextForm();
    parseTextForm()
}

function reseed() {
    seed = random(seed) + random(600, 1111);
    noiseSeed(seed);
    randomSeed(seed);
    select("#seedReport").html(" seed: " + seed);
    open = parseBox("startBox")
    unseen = parseBox("middleBox")
    closed = parseBox("endBox")
    inputText = generateText(4);
    fillTextForm();
    parseTextForm();
}

function appendText() {
    inputText = inputText.concat(generateText(1))
    print(inputText)
    fillTextForm();
    parseTextForm();
}

function parseBox(box_name) {
    let lines = select("#"+box_name).value();
    print(lines)
    lines = lines.split('\n');
    if(!lines || lines[0] == '') {
        if (box_name == "startBox") lines = placeHolderStart.split(', ');
        else if (box_name == "middleBox") lines = placeHolderMid.split(', ');
        else if (box_name == "endBox") lines = placeHolderEnd.split(', ');
    }
    return(lines)
}

let inputText = '\
Hero -> Village : Sidle back\n\
Dragon -> Treasure : Guards\n\
cycle(Hero, Rival, Cave, Basement)\n\
keylock(Basement, Cave, Dragon)\n\
wedge(Hero:Duels, Rival, Cave)';

let placeHolderStart = "Beginville"
let placeHolderMid = "Middling Woods, Tweentown, Halfcliff, Mount Medium, Medial Mesa, Central Rock, Interisles, Betwixt Beaches, Mezzo Meadows, Withinwall, Straddleroad";
let placeHolderEnd = "Endlands"

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


function generateText(amt) {
    let ret = '';
    let keys = Object.keys(rules_dict);
    let keyslen = keys.length

    let weight_sum = 0;
    for (rule in rules_dict) {
        weight_sum += rules_dict[rule]["weight"];
    }

    for (let line = 0, tries = 0;
         line < amt && open.length > 0 && tries < 100;
         line++) {
        // PICK RULE
        let idx = random(0, keyslen) | 0;
        let key = 0;
        for(let sum = 0, weight = 0; sum < weight_sum; idx = idx++ % (keyslen)) {
            key = keys[idx]
            weight += rules_dict[key]["weight"]
            if(weight > weight_sum) break;
        }

        // Generate empty array
        let args = new Array(rules_dict[key]["args"]);

        // Fill the non-terminals
        let chosenOpen = []
        for(index of rules_dict[key]["insert_open_pos"]) {
            let open_element = open.shift()
            args[index] = open_element; // pick an open elemnt
            chosenOpen.push(open_element)
        }

        let chosenUnseen = [];
        // Expand with new opens from unseen
        for(index of rules_dict[key]["unseen_to_open_pos"]) {
            if(unseen.length > 0){
                let unseen_index = random(0, unseen.length) | 0;
                let unseen_element = unseen[unseen_index]
                chosenUnseen.push(unseen_element);
                unseen.splice(unseen_index, 1)
                args[index] = unseen_element; // pick an open elemnt
            }
        }

        // Fill in rest of slots
        let err_no_more_options = false;
        for(let index = 0; index < args.length; index++) {
            if(!args[index])  {
                let chosen_pool;
                let chosen_index = 0;
                let using_unseen = false;
                if(closed.length != 0) {
                    chosen_pool = closed;
                }
                else if (unseen.length != 0) {
                    chosen_pool = unseen;
                    using_unseen = true;
                }
                else { err_no_more_options = true; break; }
                chosen_index = random(0, chosen_pool.length) | 0;
                let tries = 0;
                while(chosen_pool[chosen_index] in args) {
                    chosen_index = random(0, chosen_pool.length) | 0;
                    if(tries > 50) { err_no_more_options = true; break; }
                    tries++;
                }
                let new_element = chosen_pool[chosen_index];
                args[index] = new_element;  // if theres nothing in closed[], pick from unseen
                if(using_unseen) {
                    chosenUnseen.push(new_element);
                    unseen.splice(chosen_index, 1);
                }
            }
        }
        // add chosen open to other ehre
        closed = closed.concat(chosenOpen);
        for(let i = 0; i < chosenUnseen.length; i++) {
            open.push(chosenUnseen[i]);
        }

        ret += rules_dict[key]["template"](args) + "\n"
        // so now we have the args lol

        if(err_no_more_options) { print("Could not build any more paths!"); return; }
        tries++
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
        addEdge(social_edges, n[1][0], n[0][0], n[0][1]);
        addEdge(social_edges, n[1][0], n[2][0], n[1][1]); // make this one transparent ofr now

        let trio = [n[0][0],n[1][0],n[2][0]];
        let n0t = social_edges[ n[0][0] ]["keylock_partners"];
        n0t.push(trio)

        let n1t = social_edges[ n[1][0] ]["keylock_partners"];
        n1t.push(trio)

        let n2t = social_edges[ n[2][0] ]["keylock_partners"];
        n2t.push(trio)
    }
}

function wedge(line) {
    let c = 3;
    let n = line.split(',',c)
    n[0] = parseParamHead(n[0])
    n[1] = parseParamBody(n[1])
    n[2] = parseParamTail(n[2])
    // TODO check if a lockdoor edge exists between 0 and 2, and transfer it to 1 and 2. however, you'll have to update the key's trio as well

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
    } 
}

function addEdge(dict, src, dst, label) {
    // WRITE AN ENTRY FOR THE SRC
    if(!dict[src]) {  // CHECk IF DICT KEY-VAL PAIR IS OPEN
        dict[src] = {  
            dst: [dst],
            label: [label],
            keylock_partners: [],
            came_froms: [],
            going_tos: [dst]
        };
    }
    else { 
        let idx = dict[src]["dst"].indexOf(dst)
        if (idx == -1) { // PREVENT DUPLICATE EDGES, ALLOW REWRITES OF EDGE TO A NODE
            dict[src]["dst"].push(dst) ;
            dict[src]["label"].push(label);
        }
        else { // REWRITE
            dict[src]["dst"][idx] = dst;
            dict[src]["label"][idx] = label;
        }
    }

    // WRITE AN ENTRY FOR THE DST
    if(!dict[dst]) {  
        dict[dst] = {  
            dst: [],
            label: [label],
            keylock_partners: [],
            came_froms: [src],
        };
    }
    else { 
        let idx = dict[dst]["came_froms"].indexOf(src)
        if (idx == -1) { // PREVENT DUPLICATE EDGES, ALLOW REWRITES OF EDGE TO A NODE
            dict[dst]["came_froms"].push(dst) ;
            dict[dst]["label"].push(label);
        }
        else { // REWRITE
            dict[dst]["came_froms"][idx] = dst;
            dict[dst]["label"][idx] = label;
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
            let sty = ''
            
            // KEYS
            let ks = ''; 
            let kd = '';  // just adds key character to pointed-to node
            for(let i = 0; i < social_edges[src]["keylock_partners"].length; i++) {  // check if source has a key
                let trio = social_edges[src]["keylock_partners"][i];
                if(trio[0] == src) {  // check if src is key holder
                    ks = keyUni; 
                    // break;
                }
                if (trio[1] == src && trio[2] == dst) {  // check if any of them have the dst as the end of the keylock and src as the entrance
                    sty = "dashed";
                    edgecol = hashStringToColor(social_edges[src]["keylock_partners"][i][0]);  // hash the key location
                    // break;
                }
            }
            if(social_edges[dst]){  // this is because destinations arent yet given trios in AddEdge
                for(let i = 0; i < social_edges[dst]["keylock_partners"].length; i++) {  
                    if(social_edges[dst]["keylock_partners"][i][0] == dst) {  // right?
                        kd = keyUni; keycol = hashStringToColor(dst);
                    }
                }
            }

            // CONVERT TO DOT
            dot_fragments.push(` "${ks}${src}" -> "${kd}${dst}" [label="${label}" style="${sty}" color="${edgecol}"]`);
            if (kd != '') {
                dot_fragments.push(` "${kd}${dst}" [ fillcolor="${keycol}"   style=filled]`);  // Changes node color if it contains key
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
