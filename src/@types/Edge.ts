export class Edge {
  id: String;
  label?: String;
  fromNode: String;
  toNode: String;
  fromSide: String;
  toSide: String;

  constructor(id: string, from: string, to: string, fromSide: String, toSide: String, label?: String) {
    if (id === undefined || from === undefined || to === undefined || fromSide === undefined || toSide === undefined) {
      // console.log("id: " + id + ", from: " + from + ", to: " + to + ", fromSide: " + fromSide + ", toSide: " + toSide);
      throw new Error("Arista erronea");
    }
    this.id = id;
    this.fromNode = from;
    this.toNode = to;
    this.label = label;
    this.fromSide = fromSide;
    this.toSide = toSide;
  }
}

