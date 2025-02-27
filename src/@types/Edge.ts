export class Edge {
  id: String;
  label?: String;
  from: String;
  to: String;

  constructor(id: string, from: string, to: string, label?: String) {
    this.id = id;
    this.from = from;
    this.to = to;
    this.label = label;
  }
}
