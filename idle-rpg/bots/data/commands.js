const moment = require('moment');
const Space = require('../modules/Space');
const Crypto = require('../modules/Crypto');
const Urban = require('../modules/Urban');
const GitHub = require('../modules/Github');
const maps = require('../../game/data/maps');
const spells = require('../../game/data/globalSpells');
const enumHelper = require('../../utils/enumHelper');
const { commandChannel } = require('../../../settings');

const commands = [
  // RPG COMMANDS
  help = {
    command: ['!help', '!h'],
    operatorOnly: false,
    function: (params) => {
      const { Game, Helper, Bot, messageObj } = params;
      const helpMsg = `\`\`\`You can private message me these commands except for checking other players!
        !top10 - Retrieves top 10 highest level players
        !top10 <gold, spells, level, stolen, stole, gambles, events, bounty> - Retrieves top 10 highest of selected section
        !rank <gold, spells, level, stolen, stole, gambles, events, bounty> - Returns your current rank of selected section
        !s, !stats - Sends a PM with your stats
        !s, !stats <@Mention of player> - Sends a PM with the players stats (without < > and case-sensitive)
        !e, !equip - Sends a PM with your equipment
        !e, !equip <@Mention of player> - Sends a PM with the players equipment (without < > and case-sensitive)
        !c, !char, !character - Sends PM with your stats and equipment
        !c, !char, !character <@Mention of player> - Sends a PM with the players equipment and stats (without < > and case-sensitive)
        !m, !map - Displays the worlds locations
        !multi, !multiplier - Displays current multiplier
        !cs, !castspell - Lists spells available to cast
        !cs, !castspell <spell> - Casts a global spell onto Idle-RPG\`\`\``;
      const helpMsg2 = `\`\`\`        !el, !eventlog - Lists up to 15 past events
        !el, !eventlog <@Mention of player> - Lists up to 15 past events of mentioned player
        !pl, !pvplog - Lists up to 15 past PvP events
        !pl, !pvplog <@Mention of player> - Lists up to 15 past PvP events of mentioned player
        !nq, !newquest - Changes the quest mob if quest has not been updated for more than 2 days
        !mention <on|off|action|move> - Change if events relating to you will @Mention you
        !pm <on|off|filtered> - Change if events relating to you will be private messaged to you
        !gender <male|female|neutral|neuter> - Change your character's gender
        !lottery - Joins Daily Lottery (100 gold for entry)
        !prizepool - Displays how many players have joined the lottery and the prize pool
        !lore <Map Name> - Retrieves the lore of map selected
        !b, !bounty <@Mention of player> <Bounty Amount> - Puts a bounty on the death of a player
        !sb, !spellbook - Returns list of spells your character has learned
        !i, !inv, !inventory - Displays what your character has in his/her inventory
        \`\`\``;
      messageObj.author.send(helpMsg)
        .then(() => messageObj.author.send(helpMsg2));
    }
  },

  character = {
    command: ['!character', '!c', '!char'],
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, Helper, Bot, messageObj } = params;
      if (messageObj.content.includes(' ')) {
        let checkPlayer = messageObj.content.split(/ (.+)/)[1];
        checkPlayer = checkPlayer.replace(/([\<\@\!\>])/g, '');
        const playerObj = Bot.users.filter(player => player.id === checkPlayer && !player.bot).array();
        if (playerObj.length === 0 && process.env.NODE_ENV.includes('production')) {
          messageObj.author.send(`${checkPlayer} was not found!`);
          return;
        } else if (process.env.NODE_ENV.includes('development')) {
          playerObj.push({
            id: checkPlayer
          });
        }

        return Game.fetchCommand({
          command: 'playerStats',
          author: playerObj[0]
        })
          .then((playerStats) => {
            if (!playerStats) {
              return messageObj.author.send('This character was not found! This player probably was not born yet. Please be patient until destiny has chosen him/her.');
            }

            const stats = Helper.generateStatsString(playerStats);
            const equip = Helper.generateEquipmentsString(playerStats);
            messageObj.author.send(stats.replace('Here are your stats!', `Here is ${playerStats.name}s stats!`))
              .then(() => messageObj.author.send(equip.replace('Heres your equipment!', `Here is ${playerStats.name}s equipment!`)));
          });
      }

      return Game.fetchCommand({
        command: 'playerStats',
        author: messageObj.author
      })
        .then((playerStats) => {
          if (!playerStats) {
            return messageObj.author.send('Your character was not found! You probably were not born yet. Please be patient until destiny has chosen you.');
          }

          const stats = Helper.generateStatsString(playerStats);
          const equip = Helper.generateEquipmentsString(playerStats);
          messageObj.author.send(stats)
            .then(() => messageObj.author.send(equip));
        });
    }
  },

  inventory = {
    command: ['!inventory', '!inv', '!i'],
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, Helper, Bot, messageObj } = params;
      if (messageObj.content.includes(' ')) {
        let checkPlayer = messageObj.content.split(/ (.+)/)[1];
        checkPlayer = checkPlayer.replace(/([\<\@\!\>])/g, '');
        const playerObj = Bot.users.filter(player => player.id === checkPlayer && !player.bot).array();
        if (playerObj.length === 0 && process.env.NODE_ENV.includes('production')) {
          messageObj.author.send(`${checkPlayer} was not found!`);
          return;
        } else if (process.env.NODE_ENV.includes('development')) {
          playerObj.push({
            id: checkPlayer
          });
        }

        return Game.fetchCommand({
          command: 'playerInventory',
          author: playerObj[0]
        })
          .then((playerInventory) => {
            if (!playerInventory) {
              return messageObj.author.send('This players inventory was not found! This player probably was not born yet. Please be patient until destiny has chosen him/her.');
            }

            return Helper.generateInventoryString(playerInventory)
              .then(inv => messageObj.author.send(inv.replace('Here is your inventory!', `Here is ${playerInventory.name}s inventory!`)));
          });
      }

      Game.fetchCommand({
        command: 'playerInventory',
        author: messageObj.author
      })
        .then((playerInventory) => {
          if (!playerInventory) {
            return messageObj.author.send('Your inventory was not found! You probably were not born yet. Please be patient until destiny has chosen you.');
          }

          Helper.generateInventoryString(playerInventory)
            .then(inv => messageObj.author.send(inv));
        });
    }
  },

  resetQuest = {
    command: ['!newquest', '!nq'],
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: async (params) => {
      const { Game, messageObj } = params;
      const result = await Game.fetchCommand({
        command: 'resetQuest',
        author: messageObj.author.id
      });
      return messageObj.author.send(result);
    }
  },

  stats = {
    command: ['!stats', '!s'],
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, Helper, Bot, messageObj } = params;
      if (messageObj.content.includes(' ')) {
        let checkPlayer = messageObj.content.split(/ (.+)/)[1];
        checkPlayer = checkPlayer.replace(/([\<\@\!\>])/g, '');
        const playerObj = Bot.users.filter(player => player.id === checkPlayer && !player.bot);
        if (playerObj.size === 0) {
          messageObj.author.send(`${checkPlayer} was not found!`);
          return;
        }

        return Game.fetchCommand({
          command: 'playerStats',
          author: playerObj.array()[0]
        })
          .then((playerStats) => {
            if (!playerStats) {
              return messageObj.author.send('This players stats were not found! This player probably was not born yet. Please be patient until destiny has chosen him/her.');
            }

            const stats = Helper.generateStatsString(playerStats);
            messageObj.author.send(stats.replace('Here are your stats!', `Here is ${playerStats.name}s stats!`));
          });
      }

      Game.fetchCommand({
        command: 'playerStats',
        author: messageObj.author
      })
        .then((playerStats) => {
          if (!playerStats) {
            return messageObj.author.send('Your stats were not found! You probably were not born yet. Please be patient until destiny has chosen you.');
          }

          const stats = Helper.generateStatsString(playerStats);
          messageObj.author.send(stats);
        });
    }
  },

  equip = {
    command: ['!equip', '!e'],
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, Helper, Bot, messageObj } = params;
      if (messageObj.content.includes(' ')) {
        let checkPlayer = messageObj.content.split(/ (.+)/)[1];
        checkPlayer = checkPlayer.replace(/([\<\@\!\>])/g, '');
        const playerObj = Bot.users.filter(player => player.id === checkPlayer && !player.bot);
        if (playerObj.size === 0) {
          messageObj.author.send(`${checkPlayer} was not found!`);
          return;
        }

        return Game.fetchCommand({
          command: 'playerEquipment',
          author: playerObj.array()[0]
        })
          .then((playerEquipment) => {
            if (!playerEquipment) {
              return messageObj.author.send('This players equipment was not found! This player probably was not born yet. Please be patient until destiny has chosen him/her.');
            }

            const equip = Helper.generateEquipmentsString(playerEquipment)
            messageObj.author.send(equip.replace('Heres your equipment!', `Here is ${playerEquipment.name}s equipment!`));
          });
      }

      Game.fetchCommand({
        command: 'playerEquipment',
        author: messageObj.author
      })
        .then((playerEquipment) => {
          if (!playerEquipment) {
            return messageObj.author.send('Your equipment was not found! You probably were not born yet. Please be patient until destiny has chosen you.');
          }

          const equip = Helper.generateEquipmentsString(playerEquipment);
          messageObj.author.send(equip);
        });
    }
  },

  spellbook = {
    command: ['!spellbook', '!sb'],
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, Helper, Bot, messageObj } = params;
      if (messageObj.content.includes(' ')) {
        let checkPlayer = messageObj.content.split(/ (.+)/)[1];
        checkPlayer = checkPlayer.replace(/([\<\@\!\>])/g, '');
        const playerObj = Bot.users.filter(player => player.id === checkPlayer && !player.bot);
        if (playerObj.size === 0) {
          messageObj.author.send(`${checkPlayer} was not found!`);
          return;
        }

        return Game.fetchCommand({
          command: 'playerStats',
          author: playerObj.array()[0]
        })
          .then((playerSpells) => {
            if (!playerSpells) {
              return messageObj.author.send('This players spellbook was not found! This player probably was not born yet. Please be patient until destiny has chosen him/her.');
            }

            const spellBook = Helper.generateSpellBookString(playerSpells);
            messageObj.author.send(spellBook.replace('Here\'s your spellbook!', `Here is ${playerSpells.name}'s spellbook!`));
          });
      }

      Game.fetchCommand({
        command: 'playerStats',
        author: messageObj.author
      })
        .then((playerSpells) => {
          if (!playerSpells) {
            return messageObj.author.send('Your spellbook was not found! You probably were not born yet. Please be patient until destiny has chosen you.');
          }

          const spellBook = Helper.generateSpellBookString(playerSpells);
          messageObj.author.send(spellBook);
        });
    }
  },

  lottery = {
    command: ['!lottery'],
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, messageObj } = params;
      Game.fetchCommand({
        Game,
        command: 'joinLottery',
        author: messageObj.author
      })
        .then(msg => messageObj.author.send(msg));
    }
  },

  prizePool = {
    command: ['!prizepool'],
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, messageObj } = params;
      return Game.fetchCommand({ command: 'prizePool', author: messageObj.author });
    }
  },

  multi = {
    command: ['!multiplier', '!multi'],
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, messageObj } = params;
      return Game.fetchCommand({ command: 'checkMultiplier', author: messageObj.author });
    }
  },

  map = {
    command: ['!map', '!m'],
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { messageObj } = params;
      let mapInfo = '';
      maps.forEach((map) => {
        mapInfo = mapInfo.concat(`\n${map.name} (${map.biome.name}) Coordinates: ${map.coords}`);
      });

      messageObj.author.send(`\`\`\`Map of Idle-RPG:\n${mapInfo}\`\`\``);
    }
  },

  lore = {
    command: '!lore',
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { messageObj } = params;
      if (messageObj.content.includes(' ')) {
        const splitMessage = messageObj.content.split(/ (.+)/)[1].toLowerCase();
        const requestedMap = maps.filter(map => map.name.toLowerCase() === splitMessage)
          .map(map => map.lore);

        if (requestedMap.length === 0) {
          return messageObj.author.send(`${splitMessage} was not found. Did you type the map correctly?`);
        }

        return messageObj.author.send(`\`\`\`${splitMessage}: ${requestedMap[0]}\`\`\``);
      }

      return messageObj.author.send('You must enter a map to retrieve its lore. Check `!help` for more info.');
    }
  },

  top10 = {
    command: '!top10',
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, messageObj } = params;
      switch ((messageObj.content.split(/ (.+)/)[1] === undefined) ? 'level' : messageObj.content.split(/ (.+)/)[1].toLowerCase()) {
        case 'gambles':
          Game.fetchCommand({
            command: 'top10',
            author: messageObj.author,
            type: { gambles: -1 }
          });
          break;
        case 'stolen':
          Game.fetchCommand({
            command: 'top10',
            author: messageObj.author,
            type: { stolen: -1 }
          });
          break;
        case 'stole':
          Game.fetchCommand({
            command: 'top10',
            author: messageObj.author,
            type: { stole: -1 }
          });
          break;
        case 'gold':
          Game.fetchCommand({
            command: 'top10',
            author: messageObj.author,
            type: { 'gold.current': -1 }
          });
          break;
        case 'spells':
          Game.fetchCommand({
            command: 'top10',
            author: messageObj.author,
            type: { spellCast: -1 }
          });
          break;
        case 'events':
          Game.fetchCommand({
            command: 'top10',
            author: messageObj.author,
            type: { events: -1 }
          });
          break;
        case 'bounty':
          Game.fetchCommand({
            command: 'top10',
            author: messageObj.author,
            type: { currentBounty: -1 }
          });
          break;
        default:
          Game.fetchCommand({
            command: 'top10',
            author: messageObj.author,
            type: { level: -1 }
          });
          break;
      }
    }
  },

  rank = {
    command: '!rank',
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, messageObj } = params;
      switch ((messageObj.content.split(/ (.+)/)[1] === undefined) ? 'level' : messageObj.content.split(/ (.+)/)[1].toLowerCase()) {
        case 'gambles':
          Game.fetchCommand({
            command: 'getRank',
            author: messageObj.author,
            type: { gambles: -1 }
          });
          break;
        case 'stolen':
          Game.fetchCommand({
            command: 'getRank',
            author: messageObj.author,
            type: { stolen: -1 }
          });
          break;
        case 'stole':
          Game.fetchCommand({
            command: 'getRank',
            author: messageObj.author,
            type: { stole: -1 }
          });
          break;
        case 'gold':
          Game.fetchCommand({
            command: 'getRank',
            author: messageObj.author,
            type: { 'gold.current': -1 }
          });
          break;
        case 'spells':
          Game.fetchCommand({
            command: 'getRank',
            author: messageObj.author,
            type: { spellCast: -1 }
          });
          break;
        case 'events':
          Game.fetchCommand({
            command: 'getRank',
            author: messageObj.author,
            type: { events: -1 }
          });
          break;
        case 'bounty':
          Game.fetchCommand({
            command: 'getRank',
            author: messageObj.author,
            type: { currentBounty: -1 }
          });
          break;
        default:
          Game.fetchCommand({
            command: 'getRank',
            author: messageObj.author,
            type: { level: -1 }
          });
          break;
      }
    }
  },

  castSpell = {
    command: ['!castspell', '!cs'],
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, actionsChannel, messageObj } = params;
      if (messageObj.content.includes(' ')) {
        return Game.fetchCommand({
          Game,
          command: 'castSpell',
          author: messageObj.author,
          actionsChannel,
          spell: messageObj.content.split(/ (.+)/)[1].toLowerCase()
        });
      }
      let spellsString = '```List of Spells:\n  ';
      spellsString = spellsString.concat(Object.keys(spells).map(spell => `${spell} - ${spells[spell].spellCost} gold - ${spells[spell].description}`).join('\n  '));

      return messageObj.author.send(spellsString.concat('```'));
    }
  },

  /**
   * places a bounty on a specific player for a specific amount should work with @playername and then a gold amount
   */
  placeBounty = {
    command: ['!bounty', '!b'],
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, actionsChannel, messageObj } = params;
      const splitArray = messageObj.content.split(' ');
      if (messageObj.content.includes(' ') && splitArray.length === 3) {
        const recipient = splitArray[1].replace(/([\<\@\!\>])/g, '');
        const amount = splitArray[2];

        if (Number(amount) <= 0 || Number(amount) % 1 !== 0 || !amount.match(/^\d+$/)) {
          return messageObj.author.send('Please use a regular amount of gold.');
        }
        if (Number(amount) < 100) {
          return messageObj.author.send('You must place a bounty higher or equal to 100');
        }
        if (!recipient.match(/^\d+$/)) {
          return messageObj.author.send('Please add a bounty to a player.');
        }
        return Game.fetchCommand({
          command: 'placeBounty',
          author: messageObj.author,
          actionsChannel,
          recipient,
          amount: Number(amount)
        });
      }

      return messageObj.author.send('Please specify a player and amount of gold you wish to place on their head. You need to have enough gold to put on their head');
    }
  },

  eventLog = {
    command: ['!eventlog', '!el'],
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, messageObj } = params;
      if (messageObj.content.includes(' ')) {
        const splitCommand = messageObj.content.split(/ (.+)/);
        return Game.fetchCommand({
          command: 'playerEventLog',
          author: splitCommand[1].replace(/([\<\@\!\>])/g, ''),
          amount: 15
        })
          .then((result) => {
            if (!result || result.length === 0) {
              return messageObj.author.send('This player has not activated any Events yet.');
            }

            return messageObj.author.send(`\`\`\`${result}\`\`\``);
          });
      }

      return Game.fetchCommand({
        command: 'playerEventLog',
        author: messageObj.author.id,
        amount: 15
      })
        .then((result) => {
          if (!result || result.length === 0) {
            return messageObj.author.send('You have not activated any Events yet.');
          }

          return messageObj.author.send(`\`\`\`${result}\`\`\``);
        });
    }
  },

  pvpLog = {
    command: ['!pvplog', '!pl'],
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, messageObj } = params;
      if (messageObj.content.includes(' ')) {
        const splitCommand = messageObj.content.split(/ (.+)/);
        return Game.fetchCommand({
          command: 'playerPvpLog',
          author: splitCommand[1].replace(/([\<\@\!\>])/g, ''),
          amount: 15
        })
          .then((result) => {
            if (!result || result.length === 0) {
              return messageObj.author.send('This player has not had any PvP Events yet.');
            }

            return messageObj.author.send(`\`\`\`${result}\`\`\``);
          });
      }

      return Game.fetchCommand({
        command: 'playerPvpLog',
        author: messageObj.author.id,
        amount: 15
      })
        .then((result) => {
          if (!result || result.length === 0) {
            return messageObj.author.send('You have not had any PvP Events yet.');
          }

          return messageObj.author.send(`\`\`\`${result}\`\`\``);
        });
    }
  },

  /**
   * Subscribe to PM messages
   */
  privateMessage = {
    command: '!pm',
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, messageObj } = params;
      if (messageObj.content.includes(' ')) {
        const splitCommand = messageObj.content.split(/ (.+)/);
        switch (splitCommand[1].toLowerCase()) {
          case 'on':
          case 'off':
            return Game.fetchCommand({
              command: 'modifyPM',
              author: messageObj.author,
              value: splitCommand[1] === 'on',
              filtered: false
            });
          case 'filtered':
            return Game.fetchCommand({
              command: 'modifyPM',
              author: messageObj.author,
              value: true,
              filtered: true
            });
        }
      }

      return messageObj.author.send(`\`\`\`Possible options:
      on - You will be pmed in events that include you
      off - You won't be pmed in events that include you
      filtered - You will be pmed certain important events that include you
      \`\`\``);
    }
  },

  /**
   * Modify if player will be @Mentioned in events
   */
  modifyMention = {
    command: '!mention',
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, messageObj } = params;
      if (messageObj.content.includes(' ')) {
        const splitCommand = messageObj.content.split(/ (.+)/);

        // Use switch to validate the value
        switch (splitCommand[1].toLowerCase()) {
          case 'on':
          case 'off':
          case 'action':
          case 'move':
            return Game.fetchCommand({
              command: 'modifyMention',
              author: messageObj.author,
              value: splitCommand[1].toLowerCase()
            });
        }
      }

      return messageObj.author.send(`\`\`\`Possible options:
        on - You will be tagged in events that include you
        off - You won't be tagged in events that include you
        action - You will be tagged in action events that include you
        move - You will be tagged in move events that include you
        \`\`\``);
    }
  },

  /**
   * Modify player's gender
   */
  modifyGender = {
    command: '!gender',
    operatorOnly: false,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, messageObj } = params;
      if (messageObj.content.includes(' ')) {
        const splitCommand = messageObj.content.split(/ (.+)/);

        // Use switch to validate the value
        switch (splitCommand[1].toLowerCase()) {
          case 'male':
          case 'female':
          case 'neutral':
          case 'neuter':
            return Game.fetchCommand({
              command: 'modifyGender',
              author: messageObj.author,
              value: splitCommand[1]
            });
        }
      }

      return messageObj.author.send(`\`\`\`Possible options:
        male
        female
        neutral
        neuter
        \`\`\``);
    }
  },

  // Bot Operator commands
  setPlayerBounty = {
    command: '!setbounty',
    operatorOnly: true,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, messageObj } = params;
      const splitArray = messageObj.content.split(' ');
      if (messageObj.content.includes(' ') && splitArray.length === 3) {
        const recipient = splitArray[1].replace(/([\<\@\!\>])/g, '');
        const amount = splitArray[2];
        Game.fetchCommand({
          command: 'setPlayerBounty',
          recipient,
          amount: Number(amount)
        });
        return messageObj.author.send('Done');
      }
    }
  },

  setPlayerGold = {
    command: '!setgold',
    operatorOnly: true,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, messageObj } = params;
      const splitArray = messageObj.content.split(' ');
      if (messageObj.content.includes(' ') && splitArray.length === 3) {
        const recipient = splitArray[1].replace(/([\<\@\!\>])/g, '');
        const amount = splitArray[2];
        Game.fetchCommand({
          command: 'setPlayerGold',
          recipient,
          amount: Number(amount)
        });
        return messageObj.author.send('Done');
      }
    }
  },

  sendChristmasFirstPreMessage = {
    command: '!xmasfirst',
    operatorOnly: true,
    channelOnlyId: commandChannel,
    function: (game, message) => {
      game.sendChristmasFirstPreEventMessage();
    }
  },

  sendChristmasSecondPreMessage = {
    command: '!xmassecond',
    operatorOnly: true,
    channelOnlyId: commandChannel,
    function: (game, message) => {
      game.sendChristmasSecondPreEventMessage();
    }
  },

  christmasEventCommand = {
    command: '!xmas',
    operatorOnly: true,
    function: (game, message) => {
      if (message.content.includes(' ')) {
        switch (message.content.split(/ (.+)/)[1].toLowerCase()) {
          case 'true':
            return game.updateChristmasEvent(true);
          case 'false':
            return game.updateChristmasEvent(false);
        }
      }
    }
  },

  activateBlizzard = {
    command: '!blizzard',
    operatorOnly: true,
    function: (game, message) => {
      if (message.content.includes(' ')) {
        const splitCommand = message.content.split(/ (.+)/);
        const blizzardBoolean = game.blizzardSwitch(splitCommand[1]);
        switch (splitCommand) {
          case 'on':
            message.author.send(blizzardBoolean ? 'Blizzard is already activated!' : 'Blizzard activated.');
            break;
          case 'off':
            message.author.send(!blizzardBoolean ? 'Blizzard is already deactivated!' : 'Blizzard deactivated.');
            break;
        }
      }
    }
  },

  giveGold = {
    command: '!givegold',
    operatorOnly: true,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, messageObj } = params;
      if (messageObj.content.includes(' ') && messageObj.content.split(' ').length > 2) {
        const splitCommand = messageObj.content.split(' ');
        Game.fetchCommand({
          command: 'giveGold',
          recipient: splitCommand[1],
          amount: splitCommand[2]
        })
          .then(() => {
            messageObj.author.send('Done.');
          });
      }
    }
  },

  resetPlayer = {
    command: '!resetplayer',
    operatorOnly: true,
    channelOnlyId: commandChannel,
    function: (params) => {
      const { Game, messageObj } = params;
      if (messageObj.content.includes(' ')) {
        Game.fetchCommand({
          command: 'deletePlayer',
          recipient: messageObj.content.split(/ (.+)/)[1]
        })
          .then(() => {
            messageObj.author.send('Done.');
          });
      }
    }
  },

  resetAll = {
    command: '!resetall',
    operatorOnly: true,
    channelOnlyId: commandChannel,
    function: (game, message, discordBot) => {
      game.deleteAllPlayers(discordBot)
        .then(() => {
          message.author.send('Done.');
        });
    }
  },

  aprilFools = {
    command: '!aprilfools',
    operatorOnly: true,
    function: (game, message, discordBot) => {
      const aprilfools = discordBot.guilds.find('name', 'Idle-RPG').members
        .filter(player => player.presence.status === 'online' && !player.user.bot
          || player.presence.status === 'idle' && !player.user.bot
          || player.presence.status === 'dnd' && !player.user.bot);
      aprilfools.forEach(player => player.send('Found a Mythical Alien Relic in Topscros Path'));
    }
  },

  // MODULE COMMANDS
  giveEquipmentToPlayer = {
    command: '!giveplayer',
    operatorOnly: true,
    function: (game, message) => {
      if (message.content.includes(' ')) {
        const splitArray = message.content.split(' ');
        const playerId = splitArray[1];
        const position = splitArray[2];
        const equipment = JSON.parse(splitArray.slice(3, splitArray.length).join(' '));
        game.loadPlayer(playerId)
          .then((player) => {
            player.equipment[position] = equipment;
            game.savePlayer(player)
              .then(() => {
                message.author.send('Done.');
              });
          });
      }
    }
  },

  randomRepo = {
    command: '!ranrepo',
    function: (game, message) => {
      GitHub.randomRepo()
        .then((repoList) => {
          const ranIndex = game.helperGetter().randomBetween(0, repoList.length);
          const randomRepo = repoList[ranIndex];
          message.reply(`\nRepo: ${randomRepo.name}\nOwner: ${randomRepo.owner.login}\n${randomRepo.url.replace('api.', '').replace('/repos', '')}`);
        });
    }
  },

  nextLaunch = {
    command: '!nextlaunch',
    operatorOnly: false,
    function: (game, message) => {
      Space.nextLaunch()
        .then((spaceInfo) => {
          const nextLaunch = spaceInfo.launches[0];
          const codeBlock = '\`\`\`';
          let info = codeBlock;
          info = info.concat(`${nextLaunch.provider}s ${nextLaunch.vehicle}`);
          info = info.concat(`\nPayLoad: ${nextLaunch.payload}`);
          info = info.concat(`\nLocation: ${nextLaunch.location}`);
          info = info.concat(`\nLaunch Time: ${moment(nextLaunch.launchtime).utc('br')}`);
          info = info.concat(`\nStream: ${nextLaunch.hasStream ? 'Yes' : 'No'}`);
          info = info.concat(`\nDelayed: ${nextLaunch.delayed ? 'Yes' : 'No'}`);
          info = info.concat(codeBlock);
          message.reply(info);
        });
    }
  },

  nextStreamlaunch = {
    command: '!nextstreamlaunch',
    operatorOnly: false,
    function: (game, message) => {
      Space.nextLaunch()
        .then((spaceInfo) => {
          let nextLaunch;
          for (let i = 0; i < spaceInfo.launches.length; i++) {
            if (spaceInfo.launches[i].hasStream) {
              nextLaunch = spaceInfo.launches[i];
              break;
            }
          }

          const codeBlock = '\`\`\`';
          let info = codeBlock;
          info = info.concat(`${nextLaunch.provider}s ${nextLaunch.vehicle}`);
          info = info.concat(`\nPayLoad: ${nextLaunch.payload}`);
          info = info.concat(`\nLocation: ${nextLaunch.location}`);
          info = info.concat(`\nLaunch Time: ${moment(nextLaunch.launchtime).utc('br')}`);
          info = info.concat(`\nStream: ${nextLaunch.hasStream ? 'Yes' : 'No'}`);
          info = info.concat(`\nDelayed: ${nextLaunch.delayed ? 'Yes' : 'No'}`);
          info = info.concat(codeBlock);
          message.reply(info);
        });
    }
  },

  crypto = {
    command: '!crypto',
    operatorOnly: false,
    function: (game, message) => {
      let currency = 'BRL';
      if (message.content.includes(' ')) {
        currency = message.content.split(/ (.+)/)[1];
      }

      Crypto.top5(currency)
        .then((cyrptoInfo) => {
          const codeBlock = '\`\`\`';
          const currencyVar = `price_${currency.toLocaleLowerCase()}`;
          let info = codeBlock;
          cyrptoInfo.forEach((c) => {
            info = info.concat(`${c.name} (${c.symbol})`);
            info = info.concat(`\nRank: ${c.rank}`);
            info = info.concat(`\nUSD: ${c.price_usd}`);
            info = info.concat(`\n${currency.toUpperCase()}: ${c[currencyVar]}`);
            info = info.concat(`\nPercent Change 1h: ${c.percent_change_1h}%`);
            info = info.concat(`\nPercent Change 24h: ${c.percent_change_24h}%`);
            info = info.concat(`\nPercent Change 7d: ${c.percent_change_7d}%\n\n`);
          });
          info = info.concat(codeBlock);
          message.reply(info);
        });
    }
  },

  urban = {
    command: '!urban',
    operatorOnly: false,
    function: (game, message) => {
      if (message.content.includes(' ')) {
        const word = message.content.split(/ (.+)/)[1].toLowerCase().replace(' ', '+');

        return Urban.searchUrbanDictionary(word)
          .then((result) => {
            let definition = 'Urban Dictionary Definition of ****\n```';
            const wordDefinition = result.list.sort((item1, item2) => {
              return item2.thumbs_up - item1.thumbs_up;
            })[0];
            definition = definition.replace('****', `\`${game.helperGetter().capitalizeFirstLetter(wordDefinition.word).replace('+', ' ')}\``);

            if (definition.length >= 2000) {
              return message.reply('The result of this search was more than 2000 characters (Discords message limit) and I`m too lazy to split it for you. Have a nice day.');
            }

            return message.reply(definition.concat(`Definition:\n${wordDefinition.definition}\n\nExample:\n${wordDefinition.example}\`\`\`\n[:thumbsup::${wordDefinition.thumbs_up} / :thumbsdown::${wordDefinition.thumbs_down}]`));
          });
      }

      return message.reply('Please specify a word to look up.');
    }
  }
];
module.exports = commands;
