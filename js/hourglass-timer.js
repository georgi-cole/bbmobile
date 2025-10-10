// MODULE: hourglass-timer.js
// Animated SVG hourglass progress indicator for the timer section
// This module is isolated for easy reversibility

(function(g) {
  'use strict';

  const HourglassTimer = {
    container: null,
    svgElement: null,
    sandFill: null,
    
    // Initialize the hourglass in the given container
    init: function(containerId) {
      this.container = document.getElementById(containerId);
      if (!this.container) {
        console.warn('[HourglassTimer] Container not found:', containerId);
        return false;
      }
      
      // Create the SVG hourglass
      this.createHourglass();
      return true;
    },
    
    // Create SVG hourglass structure
    createHourglass: function() {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 100 140');
      svg.setAttribute('class', 'hourglass-svg');
      svg.setAttribute('role', 'progressbar');
      svg.setAttribute('aria-label', 'Timer progress');
      svg.setAttribute('aria-valuemin', '0');
      svg.setAttribute('aria-valuemax', '100');
      svg.setAttribute('aria-valuenow', '100');
      
      // Define gradient for sand
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.setAttribute('id', 'sandGradient');
      gradient.setAttribute('x1', '0%');
      gradient.setAttribute('y1', '0%');
      gradient.setAttribute('x2', '0%');
      gradient.setAttribute('y2', '100%');
      
      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('style', 'stop-color:#ffdc8b;stop-opacity:1');
      
      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('style', 'stop-color:#ffa500;stop-opacity:1');
      
      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      defs.appendChild(gradient);
      svg.appendChild(defs);
      
      // Hourglass glass outline (two triangles)
      const glassPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      glassPath.setAttribute('d', 'M 20,10 L 80,10 L 50,70 L 80,130 L 20,130 L 50,70 Z');
      glassPath.setAttribute('fill', 'none');
      glassPath.setAttribute('stroke', '#4a90e2');
      glassPath.setAttribute('stroke-width', '2');
      glassPath.setAttribute('class', 'hourglass-glass');
      svg.appendChild(glassPath);
      
      // Top frame
      const topFrame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      topFrame.setAttribute('x', '15');
      topFrame.setAttribute('y', '5');
      topFrame.setAttribute('width', '70');
      topFrame.setAttribute('height', '8');
      topFrame.setAttribute('rx', '2');
      topFrame.setAttribute('fill', '#357abd');
      topFrame.setAttribute('class', 'hourglass-frame');
      svg.appendChild(topFrame);
      
      // Bottom frame
      const bottomFrame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bottomFrame.setAttribute('x', '15');
      bottomFrame.setAttribute('y', '127');
      bottomFrame.setAttribute('width', '70');
      bottomFrame.setAttribute('height', '8');
      bottomFrame.setAttribute('rx', '2');
      bottomFrame.setAttribute('fill', '#357abd');
      bottomFrame.setAttribute('class', 'hourglass-frame');
      svg.appendChild(bottomFrame);
      
      // Sand in top bulb (draining)
      const topSand = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      topSand.setAttribute('d', this.getTopSandPath(100));
      topSand.setAttribute('fill', 'url(#sandGradient)');
      topSand.setAttribute('class', 'hourglass-sand-top');
      svg.appendChild(topSand);
      
      // Sand stream (thin line falling through center)
      const sandStream = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      sandStream.setAttribute('x1', '50');
      sandStream.setAttribute('y1', '68');
      sandStream.setAttribute('x2', '50');
      sandStream.setAttribute('y2', '72');
      sandStream.setAttribute('stroke', '#ffa500');
      sandStream.setAttribute('stroke-width', '1.5');
      sandStream.setAttribute('class', 'hourglass-stream');
      sandStream.setAttribute('opacity', '0');
      svg.appendChild(sandStream);
      
      // Sand in bottom bulb (filling)
      const bottomSand = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      bottomSand.setAttribute('d', this.getBottomSandPath(0));
      bottomSand.setAttribute('fill', 'url(#sandGradient)');
      bottomSand.setAttribute('class', 'hourglass-sand-bottom');
      svg.appendChild(bottomSand);
      
      this.svgElement = svg;
      this.topSandElement = topSand;
      this.bottomSandElement = bottomSand;
      this.streamElement = sandStream;
      
      this.container.innerHTML = '';
      this.container.appendChild(svg);
    },
    
    // Calculate path for top sand (drains from 100% to 0%)
    getTopSandPath: function(percent) {
      if (percent <= 0) return 'M 50,70 L 50,70';
      
      // Top bulb is an inverted triangle from y=10 to y=70
      const maxHeight = 60; // Height of top bulb
      const height = (percent / 100) * maxHeight;
      const topY = 70 - height;
      
      // Width at the top of sand (varies with height)
      const topWidth = (height / maxHeight) * 30; // Max width is 30 on each side
      const leftX = 50 - topWidth;
      const rightX = 50 + topWidth;
      
      return `M ${leftX},${topY} L ${rightX},${topY} L 50,70 Z`;
    },
    
    // Calculate path for bottom sand (fills from 0% to 100%)
    getBottomSandPath: function(percent) {
      if (percent <= 0) return 'M 50,70 L 50,70';
      
      // Bottom bulb is a triangle from y=70 to y=130
      const maxHeight = 60; // Height of bottom bulb
      const height = (percent / 100) * maxHeight;
      const bottomY = 70 + height;
      
      // Width at the bottom of sand (varies with height)
      const bottomWidth = (height / maxHeight) * 30; // Max width is 30 on each side
      const leftX = 50 - bottomWidth;
      const rightX = 50 + bottomWidth;
      
      return `M 50,70 L ${leftX},${bottomY} L ${rightX},${bottomY} Z`;
    },
    
    // Update hourglass progress (0-100)
    update: function(percent) {
      percent = Math.max(0, Math.min(100, percent));
      
      if (this.topSandElement) {
        this.topSandElement.setAttribute('d', this.getTopSandPath(percent));
      }
      
      if (this.bottomSandElement) {
        this.bottomSandElement.setAttribute('d', this.getBottomSandPath(100 - percent));
      }
      
      // Show stream when sand is draining (not at 0% or 100%)
      if (this.streamElement) {
        if (percent > 0 && percent < 100) {
          this.streamElement.setAttribute('opacity', '0.8');
        } else {
          this.streamElement.setAttribute('opacity', '0');
        }
      }
      
      // Update ARIA
      if (this.svgElement) {
        this.svgElement.setAttribute('aria-valuenow', percent.toFixed(0));
      }
    },
    
    // Reset hourglass to full
    reset: function() {
      this.update(100);
    },
    
    // Destroy hourglass and clean up
    destroy: function() {
      if (this.container) {
        this.container.innerHTML = '';
      }
      this.svgElement = null;
      this.topSandElement = null;
      this.bottomSandElement = null;
      this.streamElement = null;
    }
  };

  // Expose to global scope
  g.HourglassTimer = HourglassTimer;

})(window);
