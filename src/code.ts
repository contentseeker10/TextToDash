// Figma Plugin: Text to Dash
// Sandbox environment logic

interface Point {
  x: number;
  y: number;
}

interface PathPoint {
  point: Point;
  tangent: Point;
}

// Discretize curves to get uniform points along the path
class CurveDiscretizer {
  private points: Point[] = [];
  private lengths: number[] = [];
  public totalLength: number = 0;

  constructor(segment: { type: string; start: Point; end: Point; ctrl1?: Point; ctrl2?: Point; ctrl?: Point }) {
    const steps = 100; // precision
    let prevPoint = segment.start;
    this.points.push(prevPoint);
    this.lengths.push(0);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      let currPoint: Point;

      if (segment.type === 'line') {
        currPoint = {
          x: segment.start.x + (segment.end.x - segment.start.x) * t,
          y: segment.start.y + (segment.end.y - segment.start.y) * t
        };
      } else if (segment.type === 'cubic' && segment.ctrl1 && segment.ctrl2) {
        const mt = 1 - t;
        currPoint = {
          x: mt * mt * mt * segment.start.x + 3 * mt * mt * t * segment.ctrl1.x + 3 * mt * t * t * segment.ctrl2.x + t * t * t * segment.end.x,
          y: mt * mt * mt * segment.start.y + 3 * mt * mt * t * segment.ctrl1.y + 3 * mt * t * t * segment.ctrl2.y + t * t * t * segment.end.y
        };
      } else if (segment.type === 'quadratic' && segment.ctrl) {
        const mt = 1 - t;
        currPoint = {
          x: mt * mt * segment.start.x + 2 * mt * t * segment.ctrl.x + t * t * segment.end.x,
          y: mt * mt * segment.start.y + 2 * mt * t * segment.ctrl.y + t * t * segment.end.y
        };
      } else {
        currPoint = segment.end;
      }

      const dist = Math.hypot(currPoint.x - prevPoint.x, currPoint.y - prevPoint.y);
      this.totalLength += dist;
      this.points.push(currPoint);
      this.lengths.push(this.totalLength);
      prevPoint = currPoint;
    }
  }

  // Get point and tangent at a specific length along the segment
  public getPointAndTangentAtLength(targetLength: number): PathPoint {
    if (targetLength <= 0) {
      return { point: this.points[0], tangent: this.getTangentAt(0) };
    }
    if (targetLength >= this.totalLength) {
      return { point: this.points[this.points.length - 1], tangent: this.getTangentAt(this.points.length - 2) };
    }

    // Binary search for length segment
    let low = 0;
    let high = this.lengths.length - 1;
    while (low < high - 1) {
      const mid = Math.floor((low + high) / 2);
      if (this.lengths[mid] < targetLength) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const lenStart = this.lengths[low];
    const lenEnd = this.lengths[high];
    const segmentLength = lenEnd - lenStart;
    const ratio = segmentLength > 0 ? (targetLength - lenStart) / segmentLength : 0;

    const pStart = this.points[low];
    const pEnd = this.points[high];

    const interpolatedPoint = {
      x: pStart.x + (pEnd.x - pStart.x) * ratio,
      y: pStart.y + (pEnd.y - pStart.y) * ratio
    };

    const tangent = {
      x: pEnd.x - pStart.x,
      y: pEnd.y - pStart.y
    };
    const hyp = Math.hypot(tangent.x, tangent.y);
    if (hyp > 0) {
      tangent.x /= hyp;
      tangent.y /= hyp;
    } else {
      tangent.x = 1;
      tangent.y = 0;
    }

    return { point: interpolatedPoint, tangent };
  }

  private getTangentAt(index: number): Point {
    const p1 = this.points[index];
    const p2 = this.points[index + 1] || p1;
    const tx = p2.x - p1.x;
    const ty = p2.y - p1.y;
    const len = Math.hypot(tx, ty);
    return len > 0 ? { x: tx / len, y: ty / len } : { x: 1, y: 0 };
  }
}

// Parses standard SVG path string data
function parseSvgPath(pathData: string): any[][] {
  const regex = /([a-df-zA-DF-Z])|(-?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
  const tokens: string[] = [];
  let match;
  while ((match = regex.exec(pathData)) !== null) {
    tokens.push(match[0]);
  }

  const contours: any[][] = [];
  let currentContour: any[] = [];
  let currentPoint: Point = { x: 0, y: 0 };
  let startPoint: Point = { x: 0, y: 0 };
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];
    if (/[a-df-zA-DF-Z]/.test(token)) {
      const cmd = token;
      i++;

      if (cmd === 'M' || cmd === 'm') {
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        const targetPoint = cmd === 'm' ? { x: currentPoint.x + x, y: currentPoint.y + y } : { x, y };
        
        if (currentContour.length > 0) {
          contours.push(currentContour);
          currentContour = [];
        }
        
        currentPoint = targetPoint;
        startPoint = targetPoint;
      } 
      else if (cmd === 'L' || cmd === 'l') {
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);
        const targetPoint = cmd === 'l' ? { x: currentPoint.x + x, y: currentPoint.y + y } : { x, y };
        
        currentContour.push({ type: 'line', start: { x: currentPoint.x, y: currentPoint.y }, end: targetPoint });
        currentPoint = targetPoint;
      } 
      else if (cmd === 'C' || cmd === 'c') {
        const cp1x = parseFloat(tokens[i++]);
        const cp1y = parseFloat(tokens[i++]);
        const cp2x = parseFloat(tokens[i++]);
        const cp2y = parseFloat(tokens[i++]);
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);

        let ctrl1: Point, ctrl2: Point, end: Point;
        if (cmd === 'c') {
          ctrl1 = { x: currentPoint.x + cp1x, y: currentPoint.y + cp1y };
          ctrl2 = { x: currentPoint.x + cp2x, y: currentPoint.y + cp2y };
          end = { x: currentPoint.x + x, y: currentPoint.y + y };
        } else {
          ctrl1 = { x: cp1x, y: cp1y };
          ctrl2 = { x: cp2x, y: cp2y };
          end = { x, y };
        }

        currentContour.push({ type: 'cubic', start: { x: currentPoint.x, y: currentPoint.y }, ctrl1, ctrl2, end });
        currentPoint = end;
      } 
      else if (cmd === 'Q' || cmd === 'q') {
        const cpx = parseFloat(tokens[i++]);
        const cpy = parseFloat(tokens[i++]);
        const x = parseFloat(tokens[i++]);
        const y = parseFloat(tokens[i++]);

        let ctrl: Point, end: Point;
        if (cmd === 'q') {
          ctrl = { x: currentPoint.x + cpx, y: currentPoint.y + cpy };
          end = { x: currentPoint.x + x, y: currentPoint.y + y };
        } else {
          ctrl = { x: cpx, y: cpy };
          end = { x, y };
        }

        currentContour.push({ type: 'quadratic', start: { x: currentPoint.x, y: currentPoint.y }, ctrl, end });
        currentPoint = end;
      } 
      else if (cmd === 'Z' || cmd === 'z') {
        if (currentPoint.x !== startPoint.x || currentPoint.y !== startPoint.y) {
          currentContour.push({ type: 'line', start: { x: currentPoint.x, y: currentPoint.y }, end: { x: startPoint.x, y: startPoint.y } });
        }
        currentPoint = { x: startPoint.x, y: startPoint.y };
      }
    } else {
      // Implicit commands (e.g. repeated numbers after M or L)
      const x = parseFloat(token);
      const y = parseFloat(tokens[i++]);
      const targetPoint = { x, y };
      currentContour.push({ type: 'line', start: { ...currentPoint }, end: targetPoint });
      currentPoint = targetPoint;
      i++;
    }
  }

  if (currentContour.length > 0) {
    contours.push(currentContour);
  }

  return contours;
}

// Load fonts safely for TextNode
async function loadFontsForText(node: TextNode) {
  const fonts: FontName[] = [];
  if (node.fontName !== figma.mixed) {
    fonts.push(node.fontName as FontName);
  } else {
    const len = node.characters.length;
    for (let i = 0; i < len; i++) {
      const font = node.getRangeFontName(i, i + 1) as FontName;
      if (!fonts.some(f => f.family === font.family && f.style === font.style)) {
        fonts.push(font);
      }
    }
  }
  for (const font of fonts) {
    await figma.loadFontAsync(font);
  }
}

// Main logic
figma.showUI(__html__, { width: 280, height: 350 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'cancel') {
    figma.closePlugin();
    return;
  }

  if (msg.type === 'generate') {
    const { size, gap, rotation, cap } = msg.params;
    const selection = figma.currentPage.selection;
    const textNodes = selection.filter(n => n.type === 'TEXT') as TextNode[];

    if (textNodes.length === 0) {
      figma.notify('Please select at least one text layer.');
      return;
    }

    const generatedNodes: SceneNode[] = [];

    for (const textNode of textNodes) {
      try {
        await loadFontsForText(textNode);

        // 1. Duplicate & Flatten
        const clone = textNode.clone();
        const parent = textNode.parent || figma.currentPage;
        
        // Find sibling index
        let siblingIndex = parent.children.length;
        if (parent) {
          siblingIndex = parent.children.indexOf(textNode) + 1;
        }

        const flattened = figma.flatten([clone], parent, siblingIndex);
        if (!flattened || flattened.type !== 'VECTOR') {
          if (flattened) flattened.remove();
          continue;
        }

        const vectorPaths = flattened.vectorPaths;
        const allDashes: string[] = [];

        // 2. Process each path contour
        for (const path of vectorPaths) {
          const contours = parseSvgPath(path.data);

          for (const contour of contours) {
            // Discretize each segment in this contour
            const discretizers = contour.map(seg => new CurveDiscretizer(seg));
            const totalContourLength = discretizers.reduce((sum, d) => sum + d.totalLength, 0);

            let currentLength = 0;
            const dashPeriod = size + gap;

            // Generate points and draw dashes
            while (currentLength + size / 2 < totalContourLength) {
              const midLength = currentLength + size / 2;
              
              // Find which segment contains this length
              let remaining = midLength;
              let activeDiscretizer = discretizers[0];
              for (const d of discretizers) {
                if (remaining <= d.totalLength) {
                  activeDiscretizer = d;
                  break;
                }
                remaining -= d.totalLength;
              }

              // Get exact coordinates and direction tangent
              const { point, tangent } = activeDiscretizer.getPointAndTangentAtLength(remaining);
              
              // Calculate custom angle based on path tangent and user offset
              const baseAngle = Math.atan2(tangent.y, tangent.x);
              const customAngle = baseAngle + (rotation * Math.PI) / 180;

              // Unit vector pointing in the dash direction
              const dx = Math.cos(customAngle);
              const dy = Math.sin(customAngle);

              // Endpoints of the dash line
              const halfSize = size / 2;
              const x1 = point.x - dx * halfSize;
              const y1 = point.y - dy * halfSize;
              const x2 = point.x + dx * halfSize;
              const y2 = point.y + dy * halfSize;

              allDashes.push(`M ${x1.toFixed(3)} ${y1.toFixed(3)} L ${x2.toFixed(3)} ${y2.toFixed(3)}`);

              currentLength += dashPeriod;
            }
          }
        }

        // Clean up intermediate flattened outline
        flattened.remove();

        if (allDashes.length > 0) {
          // 3. Create output VectorNode
          const newVector = figma.createVector();
          newVector.vectorPaths = [
            {
              windingRule: 'NONZERO',
              data: allDashes.join(' ')
            }
          ];

          // Match styling, positioning, and colors
          newVector.name = `${textNode.name} (Dashed)`;
          newVector.strokes = textNode.fills; // Use fill color of text as stroke color
          newVector.strokeWeight = 1.5;
          newVector.strokeCap = cap; // ROUND or NONE (which acts as FLAT)
          newVector.strokeJoin = 'ROUND';

          // Shift the new vector node slightly to the right/down so it is next to the original
          newVector.x = textNode.x + textNode.width + 20;
          newVector.y = textNode.y;

          if (parent) {
            parent.insertChild(siblingIndex, newVector);
          }
          generatedNodes.push(newVector);
        }
      } catch (err: any) {
        console.error(err);
        figma.notify(`Error processing text: ${err.message}`);
      }
    }

    if (generatedNodes.length > 0) {
      figma.currentPage.selection = generatedNodes;
      figma.notify(`Success! Generated ${generatedNodes.length} dashed vector layers.`);
    }
  }
};
