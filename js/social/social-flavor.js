(function(global){
  'use strict';

  // Social flavor & truthiness helper
  const SocialFlavor = {};

  // Compute a truthiness level ('true'|'partial'|'lie') based on context
  SocialFlavor.computeTruthiness = function(ctx) {
    // ctx: { actorId, targetId, actorTrust, actorRivalry, roleIncentive }
    const trust = (ctx.actorTrust ?? 0);
    const rivalry = (ctx.actorRivalry ?? 0);
    const role = (ctx.roleIncentive ?? 0);

    // Base probability of telling the truth
    let p = 0.5 + trust * 0.4 - rivalry * 0.25 + role * 0.1;
    p = Math.max(0.05, Math.min(0.95, p));

    const r = Math.random();
    if (r < p * 0.7) return 'true';        // mostly true
    if (r < p) return 'partial';          // some truth
    return 'lie';                         // deceptive
  };

  // Render a short human-friendly flavor line (suitable for Diary Room list)
  SocialFlavor.renderFlavorLine = function(info) {
    // info: { actorName, targetName, suggestedTarget, phase, truthiness }
    const actor = info.actorName || 'Someone';
    const target = info.targetName || 'someone';
    const suggested = info.suggestedTarget ? `to target ${info.suggestedTarget}` : '';

    const templates = [
      `${actor} slipped into a side room with ${target} and ${suggested}.`,
      `${actor} cornered ${target}, quietly suggesting ${suggested}.`,
      `${actor} pulled ${target} aside and floated a plan ${suggested}.`,
      `${actor} and ${target} had a hushed exchange ${suggested}.`
    ];

    const t = templates[Math.floor(Math.random() * templates.length)];
    const suffix = info.truthiness === 'true' ? '' : info.truthiness === 'partial' ? ' (details murky)' : ' (might be misdirection)';
    return `${t}${suffix}`;
  };

  // Render detailed content (what was actually said) - may be hidden until spend
  SocialFlavor.renderDetailed = function(info) {
    const actor = info.actorName || 'Someone';
    const target = info.targetName || 'someone';
    const suggested = info.suggestedTarget || 'a target';
    const actionId = info.actionId || 'secret_chat';
    
    // Action-specific templates
    const templates = {
      secret_chat: [
        `${actor} whispered: "We should push to get ${suggested} out. They're a threat."\n${target} nodded thoughtfully.`,
        `${actor}: "I've been thinking... ${suggested} might be the move."\n${target}: "Tell me more."`,
        `${actor} pulled ${target} aside: "Between us, ${suggested} can't make it to the end."`
      ],
      
      alliance_invite: [
        `${actor}: "I want to propose a partnership. You and me, final two."\n${target}: "I'm listening..."`,
        `${actor}: "What if we locked in an alliance? We could control this game."\n${target}: "That's bold. But I like it."`,
        `${actor} extended a hand: "Let's make this official. Alliance?"\n${target} shook it firmly.`
      ],
      
      alliance_renew: [
        `${actor}: "Just checking in – we're still solid, right?"\n${target}: "Absolutely. Nothing's changed."`,
        `${actor}: "Our alliance is the strongest thing in this house."\n${target}: "Agreed. Let's keep it that way."`,
        `${actor}: "I wanted to reaffirm – I've got your back no matter what."\n${target}: "Same here."`
      ],
      
      probe_hoh: [
        `${actor}: "So who are you thinking for noms?"\n${target}: "Honestly? I'm leaning toward ${suggested}."`,
        `${actor} casually asked: "Got your targets locked in?"\n${target}: "Pretty much. ${suggested} is top of my list."`,
        `${actor}: "Just curious – any names floating around?"\n${target}: "Well... ${suggested} keeps coming up."`
      ],
      
      probe_pov: [
        `${actor}: "If you win veto, what's the play?"\n${target}: "${suggested ? 'I\'d probably ' + suggested + ' it.' : 'Still weighing my options.'}"`,
        `${actor}: "Honest question – would you use it?"\n${target}: "${suggested ? (suggested.includes('use') ? 'Most likely yes.' : 'Probably not.') : 'Depends on the situation.'}"`,
        `${actor}: "POV holder's got a big decision coming up."\n${target}: "${suggested ? 'Yeah, I\'m thinking ' + suggested + '.' : 'It\'s complicated.'}"`
      ],
      
      bargain_pov: [
        `${actor}: "If you save me, I'll owe you one. A big one."\n${target}: "What exactly are we talking about?"`,
        `${actor}: "Let's make a deal. You use that veto, and I'll have your back going forward."\n${target}: "Tempting..."`,
        `${actor} pleaded: "I need you to use the veto on me. Name your price."\n${target}: "I'll think about it."`
      ],
      
      favor_grant: [
        `${actor}: "I'm doing this as a favor. You remember this."\n${target}: "I won't forget it."`,
        `${actor}: "Consider this my good deed. I expect nothing... but maybe someday..."\n${target}: "Understood."`,
        `${actor} handed over information: "This is for you. Use it wisely."\n${target}: "I appreciate this."`
      ],
      
      favor_request: [
        `${actor}: "I need a favor. Can I count on you?"\n${target}: "What kind of favor?"`,
        `${actor}: "I'm asking you, as a friend – help me out here."\n${target}: "I'll see what I can do."`,
        `${actor}: "I wouldn't ask unless it was important. Will you help?"\n${target}: "For you? Maybe."`
      ],
      
      eavesdrop: [
        `${actor} overheard ${target} and ${info.pairBName || 'someone'} discussing ${suggested || 'game strategy'}.`,
        `${actor} caught fragments of a conversation between ${target} and ${info.pairBName || 'another player'} about ${suggested || 'alliances'}.`,
        `${actor} listened in as ${target} whispered to ${info.pairBName || 'someone'}: "What about ${suggested}?"`
      ],
      
      plant_rumor: [
        `${actor} to ${target}: "I heard ${info.rumorTarget || suggested} has been spreading lies about you."\n${target}: "Really? That's concerning."`,
        `${actor}: "Between you and me, ${info.rumorTarget || suggested} can't be trusted."\n${target}: "I'll keep that in mind."`,
        `${actor} planted a seed of doubt: "${info.rumorTarget || suggested} is playing both sides."\n${target} looked alarmed.`
      ],
      
      counter_rumor: [
        `${actor}: "Don't believe what you've heard about me. That's not true."\n${target}: "I didn't think it was."`,
        `${actor}: "Someone's spreading rumors. I wanted to set the record straight."\n${target}: "I appreciate the honesty."`,
        `${actor} defended themselves: "Those rumors are lies, and I can prove it."\n${target}: "Good to know."`
      ],
      
      verify_rumor: [
        `${actor}: "I heard something about you. Is it true?"\n${target}: "${(Math.random() > 0.5) ? 'Some of it, maybe.' : 'That\'s completely false.'}"`,
        `${actor}: "I need to ask you directly – what's the real story?"\n${target}: "Let me explain..."`,
        `${actor}: "Can we talk about what I heard?"\n${target}: "${(Math.random() > 0.5) ? 'Yeah, I figured this would come up.' : 'There\'s nothing to talk about.'}"`
      ],
      
      sympathy_visit: [
        `${actor}: "I know you're on the block. Just wanted to check in."\n${target}: "Thanks, I appreciate it."`,
        `${actor}: "You're in a tough spot. If there's anything I can do..."\n${target}: "That means a lot."`,
        `${actor} offered comfort: "Don't give up. There's still time to campaign."\n${target}: "You're right."`
      ],
      
      vote_rally: [
        `${actor}: "We need to rally votes against ${info.voteTarget || suggested}. You in?"\n${target}: "I think so."`,
        `${actor}: "Let's build a voting bloc. Target: ${info.voteTarget || suggested}."\n${target}: "Count me in."`,
        `${actor}: "The house needs to align on evicting ${info.voteTarget || suggested}."\n${target}: "Makes sense."`
      ],
      
      wedge_plant: [
        `${actor}: "Have you noticed ${info.thirdParty || 'someone'} and ${target} are getting close? Too close."\n${target}: "Hmm..."`,
        `${actor}: "I'd watch out for ${info.thirdParty || 'them'}. I think they're using you."\n${target}: "Really?"`,
        `${actor} sowed discord: "${info.thirdParty || 'They'} said something about you behind your back."\n${target}: "What did they say?"`
      ],
      
      rivalry_poke: [
        `${actor} to ${target}: "You think you're running this game? Please."\n${target} glared back.`,
        `${actor}: "I see through your strategy. It's not as clever as you think."\n${target}: "Whatever."`,
        `${actor} smirked: "Good luck with that plan."\n${target} was visibly annoyed.`
      ],
      
      deescalate: [
        `${actor}: "Look, we don't have to be enemies. Can we talk?"\n${target}: "Fine."`,
        `${actor}: "I want to clear the air. No hard feelings?"\n${target}: "We'll see."`,
        `${actor} extended an olive branch: "Truce?"\n${target} considered it.`
      ],
      
      betrayal_tease: [
        `${actor} hinted: "Things are shifting. You might want to reconsider your loyalties."\n${target}: "What are you saying?"`,
        `${actor}: "I'm keeping my options open. You should too."\n${target} looked uneasy.`,
        `${actor}: "Our alliance was great... but I wonder if there are better moves."\n${target}: "Excuse me?"`
      ],
      
      public_callout: [
        `${actor} called out ${target} in front of everyone: "You've been lying to the whole house!"\n${target}: "That's not true!"`,
        `${actor} confronted ${target} publicly: "Everyone needs to know what you've been doing."\nThe room went silent.`,
        `${actor}: "I'm done pretending. ${target} is playing all of us."\n${target} tried to defend themselves.`
      ],
      
      gift: [
        `${actor} gave ${target} a small token: "Just because."\n${target} smiled: "That's sweet."`,
        `${actor}: "I got this for you. Hope you like it."\n${target}: "Thank you!"`,
        `${actor} handed over a gift: "Thought you could use this."\n${target} was pleasantly surprised.`
      ]
    };
    
    const actionTemplates = templates[actionId] || templates.secret_chat;
    return actionTemplates[Math.floor(Math.random() * actionTemplates.length)];
  };
  
  // Helper to extract first sentence for partial reveals
  SocialFlavor.firstSentence = function(detailedText) {
    if (!detailedText) return '';
    const match = detailedText.match(/^[^.!?]+[.!?]/);
    return match ? match[0] : detailedText.split('\n')[0];
  };

  // Expose globally
  global.SocialFlavor = SocialFlavor;
  console.info('[social-flavor] loaded');
})(window);
