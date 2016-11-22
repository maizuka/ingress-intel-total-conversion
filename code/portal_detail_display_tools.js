// PORTAL DETAILS DISPLAY ////////////////////////////////////////////
// hand any of these functions the details-hash of a portal, and they
// will return pretty, displayable HTML or parts thereof.

// returns displayable text+link about portal range
window.getRangeText = function(d) {
  var range = getPortalRange(d);

  var title = '基本距離:\t' + digits(Math.floor(range.base))+' m' +
      '\nリンクアンプ:\t×'+range.boost +
      '\n距離:\t'+digits(Math.floor(range.range))+' m';

  if(!range.isLinkable) title += '\nレゾネーター欠損,\n新しいリンク作成不可';

  return ['距離',
      '<a onclick="window.rangeLinkClick()"' +
    (range.isLinkable ? '' : ' style="text-decoration:line-through;"') +
    '>' +
    (range.range > 1000 ?
      Math.floor(range.range/1000) + ' km' :
      Math.floor(range.range)      + ' m') +
    '</a>',
    title];
};


// given portal details, returns html code to display mod details.
window.getModDetails = function(d) {
  var mods = [];
  var modsTitle = [];
  var modsColor = [];
  $.each(d.mods, function(ind, mod) {
    var modName = '';
    var modTooltip = '';
    var modColor = '#000';

    if (mod) {
      // all mods seem to follow the same pattern for the data structure
      // but let's try and make this robust enough to handle possible future differences

      modName = mod.name || '(unknown mod)';

      if (mod.rarity) {
        modName = mod.rarity.capitalize().replace(/_/g,' ') + '<br>' + modName;
      }

      modName = modName
        .replace(/Portal Shield/, 'ポータル<br>シールド')
        .replace(/AXA Shield/, 'AXA<br>シールド')
        .replace(/Turret/, 'ターレット')
        .replace(/Force Amp/, 'フォース<br>アンプ')
        .replace(/Link Amp/, 'リンク<br>アンプ')
        .replace(/Link Amp/, 'リンク<br>アンプ')
        .replace(/Multi-hack/, 'マルチ<br>ハック')
        .replace(/Heat Sink/, 'ヒート<br>シンク');

      modTooltip = modName + '\n';
      if (mod.owner) {
        modTooltip += '設置: ' + mod.owner + '\n';
      }

      if (mod.stats) {
        modTooltip += '効果:';
        for (var key in mod.stats) {
          if (!mod.stats.hasOwnProperty(key)) continue;
          var val = mod.stats[key];
          var keyname = '';

          // if (key === 'REMOVAL_STICKINESS' && val == 0) continue;  // stat on all mods recently - unknown meaning, not displayed in stock client

          // special formatting for known mod stats, where the display of the raw value is less useful
          switch (key) {
            case 'HACK_SPEED': // 500000 = 50%
              val = (val/10000)+'%';
              keyname = 'ハックスピード';
              break;
            case 'HIT_BONUS': // 300000 = 30%
              val = (val/10000)+'%';
              keyname = 'クリティカルヒット';
              break;
            case 'ATTACK_FREQUENCY': // 2000 = 2x
              val = (val/1000) +'x';
              keyname = '攻撃頻度';
              break;
            case 'FORCE_AMPLIFIER': // 2000 = 2x
              val = (val/1000) +'x';
              keyname = '攻撃力';
              break;
            case 'LINK_RANGE_MULTIPLIER': // 2000 = 2x
              val = (val/1000) +'x';
              keyname = 'リンク距離';
              break;
            case 'LINK_DEFENSE_BOOST': // 1500 = 1.5x
              val = (val/1000) +'x';
              keyname = 'リンク防御力';
              break;
            case 'REMOVAL_STICKINESS': // an educated guess
              if (val > 100)
                val = (val/10000)+'%';
              keyname = '剥がれにくさ';
              break;
            case 'MITIGATION':
              val = val + '%';
              keyname = 'ダメージ緩和';
              break;
          }
          // else display unmodified. correct for shield mitigation and multihack - unknown for future/other mods

          if (keyname === '')
            keyname = key.capitalize().replace(/_/g,' ');
          modTooltip += '\n+' +  val + ' ' + keyname;
        }
      }

      if (mod.rarity) {
        modColor = COLORS_MOD[mod.rarity];
      } else {
        modColor = '#fff';
      }
    }

    mods.push(modName);
    modsTitle.push(modTooltip);
    modsColor.push(modColor);
  });


  var t = '';
  for (var i=0; i<mods.length; i++) {
    t += '<span'+(modsTitle[i].length ? ' title="'+modsTitle[i]+'"' : '')+' style="color:'+modsColor[i]+'">'+mods[i]+'</span>';
  }
  // and add blank entries if we have less than 4 mods (as the server no longer returns all mod slots, but just the filled ones)
  for (i=mods.length; i<4; i++) {
    t += '<span style="color:#000"></span>';
  }

  return t;
};

window.getEnergyText = function(d) {
  var currentNrg = getCurrentPortalEnergy(d);
  var totalNrg = getTotalPortalEnergy(d);
  var title = currentNrg + ' / ' + totalNrg;
  var fill = prettyEnergy(currentNrg) + ' / ' + prettyEnergy(totalNrg);
  return ['XM', fill, title];
};


window.getResonatorDetails = function(d) {
  var resoDetails = [];
  // octant=slot: 0=E, 1=NE, 2=N, 3=NW, 4=W, 5=SW, 6=S, SE=7
  // resos in the display should be ordered like this:
  //   N    NE         Since the view is displayed in rows, they
  //  NW    E          need to be ordered like this: N NE NW E W SE SW S
  //   W    SE         i.e. 2 1 3 0 4 7 5 6
  //  SW    S
  // note: as of 2014-05-23 update, this is not true for portals with empty slots!

  var processResonatorSlot = function(reso,slot) {
    var lvl=0, nrg=0, owner=null;

    if (reso) {
      lvl = parseInt(reso.level);
      nrg = parseInt(reso.energy);
      owner = reso.owner;
    }

    resoDetails.push(renderResonatorDetails(slot, lvl, nrg, owner));
  };


  // if all 8 resonators are deployed, we know which is in which slot

  if (d.resonators.length == 8) {
    // fully deployed - we can make assumptions about deployment slots
    $.each([2, 1, 3, 0, 4, 7, 5, 6], function(ind, slot) {
      processResonatorSlot(d.resonators[slot],slot);
    });
  } else {
    // partially deployed portal - we can no longer find out which resonator is in which slot
    for(var ind=0; ind<8; ind++) {
      processResonatorSlot(ind < d.resonators.length ? d.resonators[ind] : null, null);
    }

  }

  return '<table id="resodetails">' + genFourColumnTable(resoDetails) + '</table>';

};

// helper function that renders the HTML for a given resonator. Does
// not work with raw details-hash. Needs digested infos instead:
// slot: which slot this resonator occupies. Starts with 0 (east) and
// rotates clockwise. So, last one is 7 (southeast).
window.renderResonatorDetails = function(slot, level, nrg, nick) {
  var className;
  if(OCTANTS[slot] === 'N')
    className = 'meter north';
  else
    className = 'meter';

  var max = RESO_NRG[level];
  var fillGrade = level > 0 ? nrg/max*100 : 0;

  var inf = (level > 0 ? 'XM:\t' + nrg   + ' / ' + max + ' (' + Math.round(fillGrade) + '%)\n' +
                       'レベル:\t'  + level + '\n' +
                       'オーナー:\t'  + nick  + '\n' :
                       '') +
            (slot !== null ? '方角:\t' + OCTANTS[slot] + ' ' + OCTANTS_ARROW[slot]:'');

  var style = fillGrade ? 'width:'+fillGrade+'%; background:'+COLORS_LVL[level]+';':'';

  var color = (level < 3 ? "#9900FF" : "#FFFFFF");

  var lbar = level > 0 ? '<span class="meter-level" style="color: ' + color + ';"> L ' + level + ' </span>' : '';

  var fill  = '<span style="'+style+'"></span>';

  var meter = '<span class="' + className + '" title="'+inf+'">' + fill + lbar + '</span>';

  nick = nick ? '<span class="nickname">'+nick+'</span>' : null;
  return [meter, nick || ''];
};

// calculate AP gain from destroying portal and then capturing it by deploying resonators
window.getAttackApGainText = function(d,fieldCount,linkCount) {
  var breakdown = getAttackApGain(d,fieldCount,linkCount);
  var totalGain = breakdown.enemyAp;

  var t = '';
  if (teamStringToId(PLAYER.team) == teamStringToId(d.team)) {
    totalGain = breakdown.friendlyAp;
    t += '友好AP:\t' + breakdown.friendlyAp + '\n';
    t += '- デプロイ ' + breakdown.deployCount + '個, ';
    t += '更新 ' + breakdown.upgradeCount + '個\n';
    t += '\n';
  }
  t += '敵対AP:\t' + breakdown.enemyAp + '\n';
  t += '- 破壊:\t' + breakdown.destroyAp + '\n';
  t += '- キャプチャー:\t' + breakdown.captureAp + '\n';

  return ['獲得AP', digits(totalGain), t];
};


window.getHackDetailsText = function(d) {
  var hackDetails = getPortalHackDetails(d);

  var shortHackInfo = hackDetails.hacks+' @ '+formatInterval(hackDetails.cooldown);

  var title = 'ハック可能数:\t'+hackDetails.hacks+'\n' +
              'クールダウン間隔:\t'+formatInterval(hackDetails.cooldown)+'\n' +
              '最短バーンアウト:\t'+formatInterval(hackDetails.burnout) + '\n' +
              'バーンアウト:\t4時間';

  return ['ハック', shortHackInfo, title];
};


window.getMitigationText = function(d,linkCount) {
  var mitigationDetails = getPortalMitigationDetails(d,linkCount);

  var mitigationShort = mitigationDetails.total;
  if (mitigationDetails.excess) mitigationShort += ' (+'+mitigationDetails.excess+')';

  var title = 'シールド合計:\t'+(mitigationDetails.shields+mitigationDetails.links)+'\n' +
              '- 有効:\t'+mitigationDetails.total+'\n' +
              '- 超過:\t'+mitigationDetails.excess+'\n' +
              '内訳\n' +
              '- シールド:\t'+mitigationDetails.shields+'\n' +
              '- リンク:\t'+mitigationDetails.links;

  return ['シールド', mitigationShort, title];
};
