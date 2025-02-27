import { ItemView, App, FrontMatterCache, FrontmatterLinkCache, TFile } from "obsidian";
import { Edge } from "src/@types/Edge";
import { isNamedLink, isNamedLinkTree, isNoteNode, isUnnamedLink, Link, NamedLink, NamedLinkTree, Node, NoteNode, UnnamedLink } from "src/@types/Node";

/**
 @param {App} app - El parámetro app que nos permite acceder a la API de obsidian
 @return {Array<Node> | null} Devuelve un Array con los nodos del Canvas o null en caso de no estar en un canvas al ejecutar la función.
*/
export function getNodesInCanvas(app: App): Array<Node> | null {
  const canvasView = app.workspace.getActiveViewOfType(ItemView);
  if (canvasView?.getViewType() !== 'canvas') return null;
  const canvas = (canvasView as any).canvas;
  const nodes: Map<String, any> = canvas.nodes;

  var nodeList: Array<Node> = new Array();
  for (let [k, v] of nodes) {
    switch (v.file) {
      //Entramos aquí si es un nodo de texto
      case undefined:
        nodeList.push(
          {
            id: k,
            position: [v.x, v.y],
            text: v.text
          }
        );
        break;

      //Entramos aquí si es un nodo con un archivo
      default:
        var links: Array<NamedLink | NamedLinkTree | UnnamedLink> = new Array();
        for (let link of parseFrontmatterLinks(this.app, v.file)) {
          links.push(link);
        };
        //Falta añadir los nodos que no están en el frontmatter y quitar los enlaces repetidos (salvo los que están en el frontmatter)
        //La función app.metadataCache.getFileCache(v.file)?.links; me da los enlaces, solo queda comrobar que ni hay ningún 
        var nonFmLinks: Array<Link> | undefined = app.metadataCache.getFileCache(v.file)?.links?.map((e) => {
          return linkFromText(app, e.original, v.file);
        });
        if (nonFmLinks !== undefined && nonFmLinks.length !== 0) {
          var possibleNonRepeatedLinks = [...new Set(nonFmLinks)];
          let linksLength: number = links.length;
          for (let i = 0; i < possibleNonRepeatedLinks.length; i++) {
            let isRepeated: boolean = false;
            for (let j = 0; j < linksLength; j++) {
              let l = links[j];
              if (isNamedLinkTree(l)) {
                for (let entry of l.links) {
                  if (entry.fileName === possibleNonRepeatedLinks[i].fileName) {
                    isRepeated = true;
                    break;
                  }
                }
              } else if (l.fileName === possibleNonRepeatedLinks[i].fileName) {
                isRepeated = true;
              }
              if (isRepeated) {
                break;
              }
            }
            if (!isRepeated) {
              links.push(possibleNonRepeatedLinks[i]);
            }
          }
        }


        nodeList.push({
          id: k,
          position: [v.x, v.y],
          filePath: v.filePath,
          displayName: v.file.basename,
          links: links,
        });
        break;
    }

  }


  return nodeList;
}

/**
 @param {App} app - El objeto que permite acceder a la API de obsidian
 @returns {Array<Edge>} Un vector con los ejes ya presentes en el canvas.
*/
export function getEdges(app: App): Array<Edge> | null {
  const canvasView = app.workspace.getActiveViewOfType(ItemView);
  if (canvasView?.getViewType() !== 'canvas') return null;
  const canvas = (canvasView as any).canvas;
  const edges = [...canvas.edges].map((e) => new Edge(e[0], e[1].from.node.id, e[1].to.node.id, e[1].label));
  return edges;
}

export function getMissingLinks(nodes: Array<Node>, edges: Array<Edge>, app: App) {
  const canvasView = app.workspace.getActiveViewOfType(ItemView);
  if (canvasView?.getViewType() !== 'canvas') return null;
  const canvas = (canvasView as any).canvas;

  const nodeMap: Map<string, any> = canvas.nodes;

  // console.log(canvas);
  const missingLinks = nodes.filter(isNoteNode).map(e => {
    let array: Array<[String, NamedLinkTree | Link]> = new Array();
    for (let link of e.links) {
      array.push([e.filePath, link]);
    }
    return array;
  }).flat().filter(e => {
    if (isUnnamedLink(e[1])) {
      for (let edge of edges) {
        let fromPath: string = nodeMap.get(edge.from.toString()).filePath;
        let toPath: string = nodeMap.get(edge.to.toString()).filePath;

        if (toPath === undefined) {
          continue;
        }

        if (fromPath !== e[0]) {
          continue;
        } e
        if (toPath === e[1].filePath) {
          return false
        }

      }
    } else if (isNamedLink(e[1])) {
      //Tengo que comprobar si el eje con nombre del NamedLink está presente en el canvas y si el arbolito del NamedLinkTree lo está
      let l: NamedLink = e[1];
      for (let edge of edges) {
        let fromPath: string = nodeMap.get(edge.from.toString()).filePath;
        let toPath: string = nodeMap.get(edge.to.toString()).filePath;

        // Filtra los nodos de texto, pues no tienen filePath
        if (toPath === undefined) {
          continue;
        }

        if (edge.label !== l.name) {
          continue;
        }

        if (fromPath !== e[0]) {
          continue;
        }
        if (toPath === l.filePath) {
          return false
        }
      }
    } else if (isNamedLinkTree(e[1])) {
      //Devuelve false si no esta el enlace COMPLETO, luego al añadir los elaces ya me encargo de ver cuales hay y cuales no
      let l = e[1];
      let textNodeId: String | null = null;
      for (let edge of edges) {
        let fromPath: string = nodeMap.get(edge.from.toString()).filePath;
        let toText: string = nodeMap.get(edge.to.toString()).text;

        if (toText === undefined || toText !== l.name || edge.label !== "" || fromPath !== e[0]) {
          continue;
        }
        textNodeId = edge.to;
      }
      if (textNodeId === null) {
        return true;
      }

      let allLinksPresent: boolean = true;
      let treeLinks = l.links.filter((f) => {
        for (let [_, node] of nodeMap) {
          if (node.filePath === f.filePath) return true;
        }
        return false;
      });

      let filteredEdges = edges.filter((f) => f.from.toString() === textNodeId);

      for (let link of treeLinks) {
        let linkPresent: boolean = false;
        for (let edge of filteredEdges) {
          if (nodeMap.get(edge.to.toString()).filePath !== link.filePath) {
            continue;
          }
          linkPresent = true;
        }
        allLinksPresent = allLinksPresent && linkPresent;
      }
      if (allLinksPresent) {
        return false;
      }

    }

    return true;
  });

  // console.log(missingLinks);
  return missingLinks;
}


/**
 @param {App} app - El objeto que perm:NoteNode[]ite acceder a la API de obsidian
 @param {TFile} file - El objeto que representa al archivo del nodo del que se están leyendo.
 @returns {Array<NamedLink|NamedLinkTree>} Devuelve un vector con los enlaces del frontmatter de la nota que conforma el nodo, estos tienen que tener nombre por estar en el frontmatter.

*/
function parseFrontmatterLinks(app: App, file: TFile): Array<NamedLink | NamedLinkTree> {
  var array: Array<NamedLink | NamedLinkTree> = new Array();
  const fm: FrontMatterCache | undefined = app.metadataCache.getFileCache(file)?.frontmatter;
  const links: FrontmatterLinkCache[] | undefined = app.metadataCache.getFileCache(file)?.frontmatterLinks;

  if (fm === undefined || links === undefined) {
    return array;
  }

  for (let [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) {

      var filtered = v.filter(isLink);
      if (filtered.length === 0) continue;
      var treeArray: Array<UnnamedLink> = filtered.map((v) => {
        return linkFromText(app, v, file.path);
      });

      if (treeArray.length !== 0) {
        array.push(new NamedLinkTree(k, treeArray));
      }
    } else if (String.isString(v)) {
      if (isLink(v)) {
        var unamedLink = linkFromText(app, v, file.path);

        array.push(new NamedLink(k, unamedLink.fileName, unamedLink.filePath));
      }
    }
  }

  return array;
}

/**
 @param {string} s - La cadena a comprobar
 @returns {boolean} true si la cadena s es un enlace válido de obsidian y false en caso contrario
*/
export function isLink(s: string): boolean {
  return s.substring(0, 2) === "[[" && s.substring(s.length - 2) === "]]";
}

/**
 @param {App} app - El objeto que permite acceder a la API de obsidian
 @param {string} linkText - El texto del enlace a partie del que construimos el enlace.
 @param {string} filePath - La ruta al archivo del nodo.

 @returns {Link} Un objeto Link que representa el enlace de obsidian entre el archivo del nodo y el destino que se induce de la cadena filePath.
*/
function linkFromText(app: App, linkText: string, filePath: string): UnnamedLink {
  var name: String = linkText.substring(2, linkText.length - 2);

  var hayAlias = name.indexOf("|");
  if (hayAlias !== -1) {
    name = name.substring(0, hayAlias);
  }
  var destFile: TFile | null = app.metadataCache.getFirstLinkpathDest(name.toString(), filePath);
  if (destFile === null) {
    return new UnnamedLink(name);
  }
  var destPath = destFile.path;

  // console.log(destPath);

  return new UnnamedLink(name, destPath);
}
