export class TextNode {
  id: String;
  position: [number, number];
  text: String;
}

export class NoteNode {
  id: String;
  position: [number, number];
  filePath: String;
  displayName: String;
  links: Array<NamedLinkTree | Link>;
}

export function isNoteNode(node: Node): node is NoteNode {
  return (node as NoteNode).filePath !== undefined;
}

export function isTextNode(node: Node): node is TextNode {
  return (node as TextNode).text !== undefined;
}

export type Node = NoteNode | TextNode;

enum LinkType {
  Unnamed,
  Named,
  Tree
}

export interface Link {
  readonly type: LinkType;
  filePath?: String;
  fileName: String;
}

export class UnnamedLink implements Link {
  type = LinkType.Unnamed;
  filePath?: String;
  fileName: String;

  constructor(fileName: String, filePath?: String) {
    this.type = LinkType.Unnamed;
    this.fileName = fileName;
    this.filePath = filePath;
  }
}

export class NamedLink implements Link {
  type = LinkType.Named;
  name: String;
  filePath?: String;
  fileName: String;

  constructor(name: String, fileName: String, filePath?: String) {
    this.type = LinkType.Named;
    this.name = name;
    this.fileName = fileName;
    this.filePath = filePath;
  }
}


export class NamedLinkTree {
  type = LinkType.Tree;
  name: String;
  links: Array<UnnamedLink>;
  constructor(name: String, links: Array<Link>) {
    this.type = LinkType.Tree;
    this.name = name;
    this.links = links;
  }
}

export function isNamedLink(link: Link | NamedLinkTree): link is NamedLink {
  return (link as NamedLink).type === LinkType.Named;
}

export function isUnnamedLink(link: Link | NamedLinkTree): link is UnnamedLink {
  return (link as UnnamedLink).type === LinkType.Unnamed;
}

export function isNamedLinkTree(link: Link | NamedLinkTree): link is NamedLinkTree {
  return (link as NamedLinkTree).type === LinkType.Tree;
}

