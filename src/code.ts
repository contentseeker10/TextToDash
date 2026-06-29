// Initial Figma plugin sandbox code
figma.showUI(__html__, { width: 300, height: 400 });

figma.ui.onmessage = (msg) => {
  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
