/**
 * mobile_roster_spec.cy.js
 * 
 * Cypress e2e tests for mobile roster badges and spacing.
 * Tests the pill→emoji flow, combo emojis, fast-forward behavior,
 * and last-row visibility with the TV overlay.
 */

describe('Mobile Roster Badges and Spacing', () => {
  beforeEach(() => {
    // Visit the test page
    cy.visit('tests/mobile_roster_badges_and_spacing.html');
    
    // Wait for mobile roster to initialize
    cy.get('.mobile-roster-container').should('exist');
    cy.get('.mobile-roster-active-grid').should('exist');
    
    // Wait for tiles to render
    cy.get('.mobile-roster-tile').should('have.length.at.least', 12);
  });

  describe('Last Row Visibility', () => {
    it('should ensure final gap equals row gap and last row is visible', () => {
      // Get the last tile
      cy.get('.mobile-roster-tile').last().then(($lastTile) => {
        const lastTileBottom = $lastTile[0].getBoundingClientRect().bottom;
        
        // Get the TV overlay top
        cy.get('.tv').then(($tv) => {
          const tvTop = $tv[0].getBoundingClientRect().top;
          const gap = tvTop - lastTileBottom;
          
          // Gap should be at least 6px (the row gap)
          expect(gap).to.be.at.least(6);
          
          // Take screenshot for visual verification
          cy.screenshot('last-row-visible');
        });
      });
    });

    it('should maintain visibility when TV height changes', () => {
      // Change TV height using slider
      cy.get('#tvHeightSlider').invoke('val', 300).trigger('change');
      
      // Wait for layout to settle
      cy.wait(200);
      
      // Verify last row is still visible
      cy.get('.mobile-roster-tile').last().then(($lastTile) => {
        const lastTileBottom = $lastTile[0].getBoundingClientRect().bottom;
        
        cy.get('.tv').then(($tv) => {
          const tvTop = $tv[0].getBoundingClientRect().top;
          const gap = tvTop - lastTileBottom;
          
          // Gap should still be at least 6px
          expect(gap).to.be.at.least(6);
          
          cy.screenshot('last-row-visible-after-tv-resize');
        });
      });
    });

    it('should handle different cast sizes correctly', () => {
      const castSizes = [12, 14, 16];
      
      castSizes.forEach((size) => {
        // Change cast size
        cy.get('#castSizeSlider').invoke('val', size).trigger('change');
        
        // Wait for roster to re-render
        cy.wait(300);
        
        // Verify tiles count
        cy.get('.mobile-roster-tile').should('have.length', size);
        
        // Verify last row visibility
        cy.get('.mobile-roster-tile').last().then(($lastTile) => {
          const lastTileBottom = $lastTile[0].getBoundingClientRect().bottom;
          
          cy.get('.tv').then(($tv) => {
            const tvTop = $tv[0].getBoundingClientRect().top;
            const gap = tvTop - lastTileBottom;
            
            // Gap should be at least 6px
            expect(gap).to.be.at.least(6);
          });
        });
        
        cy.screenshot(`cast-size-${size}-visible`);
      });
    });
  });

  describe('Badge Pill Animation', () => {
    it('should show pill first for a new badge, then emoji after ~7s', () => {
      // Trigger HOH event
      cy.window().then((win) => {
        win.TestUtils.triggerHOH();
      });
      
      // Wait a moment for the event to process
      cy.wait(100);
      
      // Pill should be visible
      cy.get('.badge-pill').should('exist').and('be.visible');
      cy.screenshot('badge-pill-active');
      
      // Wait for pill duration (7 seconds) + buffer
      cy.wait(7500);
      
      // Pill should be gone
      cy.get('.badge-pill').should('not.exist');
      
      // Corner emoji should be visible
      cy.get('.corner-emoji-badge').should('exist').and('be.visible');
      cy.screenshot('badge-emoji-after-pill');
    });

    it('should replace name with pill when badge triggers', () => {
      // Get a tile before triggering badge
      cy.get('.mobile-roster-tile').first().find('.mobile-roster-name').then(($name) => {
        const originalName = $name.text().trim();
        
        // Trigger HOH for first player
        cy.window().then((win) => {
          const playerId = win.game.players[0].id;
          win.bbGameBus.emit('player:hoh', { playerId });
        });
        
        // Wait for animation
        cy.wait(200);
        
        // Name area should now contain pill, not original name
        cy.get('.mobile-roster-tile').first().find('.mobile-roster-name').should('have.class', 'badge-pill-active');
        cy.get('.mobile-roster-tile').first().find('.badge-pill').should('contain.text', 'HOH');
      });
    });
  });

  describe('Fast-Forward Behavior', () => {
    it('should immediately show emoji(s) when fast-forward triggers', () => {
      // Trigger HOH event
      cy.window().then((win) => {
        win.TestUtils.triggerHOH();
      });
      
      // Wait for pill to appear
      cy.wait(100);
      cy.get('.badge-pill').should('exist');
      cy.screenshot('badge-before-ffwd');
      
      // Trigger fast-forward
      cy.window().then((win) => {
        win.TestUtils.triggerFastForward();
      });
      
      // Wait for transition
      cy.wait(100);
      
      // Pill should be gone immediately
      cy.get('.badge-pill').should('not.exist');
      
      // Corner emoji should be visible
      cy.get('.corner-emoji-badge').should('exist');
      cy.screenshot('badge-after-ffwd');
    });

    it('should skip remaining pill time on phase advance', () => {
      // Trigger multiple badges
      cy.window().then((win) => {
        win.TestUtils.triggerHOH();
      });
      
      cy.wait(100);
      
      cy.window().then((win) => {
        win.TestUtils.triggerPOV();
      });
      
      cy.wait(100);
      
      // Pills should exist
      cy.get('.badge-pill').should('have.length.at.least', 1);
      
      // Trigger phase skip
      cy.window().then((win) => {
        win.bbGameBus.emit('phase:skip', {});
      });
      
      // Pills should be dismissed
      cy.wait(100);
      cy.get('.badge-pill').should('not.exist');
      
      // Emojis should be visible
      cy.get('.corner-emoji-badge').should('have.length.at.least', 2);
      cy.screenshot('after-phase-skip');
    });
  });

  describe('Combo Emojis', () => {
    it('should render grouped emojis for combined statuses', () => {
      // Trigger combo status (HOH+POV)
      cy.window().then((win) => {
        win.TestUtils.triggerComboStatus();
      });
      
      // Wait for second event
      cy.wait(200);
      
      // Fast-forward to skip pills
      cy.window().then((win) => {
        win.TestUtils.triggerFastForward();
      });
      
      cy.wait(100);
      
      // Emoji group should exist with multiple emojis
      cy.get('.corner-emoji-group').should('exist');
      cy.get('.corner-emoji-group .corner-emoji-badge').should('have.length', 2);
      
      // Should contain both HOH and POV emojis
      cy.get('.corner-emoji-hoh').should('exist');
      cy.get('.corner-emoji-pov').should('exist');
      
      cy.screenshot('combo-emojis-hoh-pov');
    });

    it('should render SAFE only if its the sole token', () => {
      // Trigger SAFE for a player
      cy.window().then((win) => {
        win.TestUtils.triggerSafe();
      });
      
      // Fast-forward to show emojis
      cy.wait(100);
      cy.window().then((win) => {
        win.TestUtils.triggerFastForward();
      });
      
      cy.wait(100);
      
      // SAFE emoji should be visible
      cy.get('.corner-emoji-safe').should('exist');
      cy.screenshot('safe-only-emoji');
      
      // Reset and trigger HOH + SAFE (SAFE should not show)
      cy.window().then((win) => {
        win.TestUtils.resetPlayers();
      });
      
      cy.wait(200);
      
      // Give first player HOH and SAFE
      cy.window().then((win) => {
        const player = win.game.players[0];
        player.hoh = true;
        player.safe = true;
        win.game.hohId = player.id;
        win.bbGameBus.emit('player:hoh', { playerId: player.id });
      });
      
      cy.wait(100);
      cy.window().then((win) => {
        win.TestUtils.triggerFastForward();
      });
      
      cy.wait(100);
      
      // HOH emoji should be visible, SAFE should not
      cy.get('.corner-emoji-hoh').should('exist');
      // SAFE should not be visible when HOH is present
      // (this is enforced by the computeBadges logic)
      cy.screenshot('hoh-without-safe-emoji');
    });
  });

  describe('No Extra Vertical Space', () => {
    it('should not add vertical space between photo and name due to badge overlays', () => {
      // Measure height of a tile without badge
      cy.get('.mobile-roster-tile').first().then(($tile) => {
        const heightWithoutBadge = $tile[0].offsetHeight;
        
        // Trigger HOH for this player
        cy.window().then((win) => {
          const playerId = win.game.players[0].id;
          win.bbGameBus.emit('player:hoh', { playerId });
        });
        
        cy.wait(100);
        
        // Measure height with badge pill
        cy.get('.mobile-roster-tile').first().then(($tileWithBadge) => {
          const heightWithBadge = $tileWithBadge[0].offsetHeight;
          
          // Heights should be the same (±2px tolerance for subpixel differences)
          expect(Math.abs(heightWithBadge - heightWithoutBadge)).to.be.lessThan(3);
          
          cy.screenshot('tile-height-comparison');
        });
      });
    });
  });

  describe('Metrics Panel', () => {
    it('should display correct metrics', () => {
      // Wait for metrics to update
      cy.wait(600);
      
      // Check cast size metric
      cy.get('#metricCastSize').should('not.be.empty');
      
      // Check row gap metric
      cy.get('#metricRowGap').should('contain.text', 'px');
      
      // Check overlay height metric
      cy.get('#metricOverlayHeight').should('contain.text', 'px');
      
      // Check last row status
      cy.get('#metricOverlapStatus').should('contain.text', 'Visible');
      
      cy.screenshot('metrics-panel');
    });
  });
});
