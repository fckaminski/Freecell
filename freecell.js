/**
 * Encapsulate the game
 */
var Game = function() {
    // the empty slots for moving cards
    this.free = [null, null, null, null];
    // the spaces to hold the completed suits
    this.suits = [null, null, null, null];
    // the columns of cards
    this.columns = [[], [], [], [], [], [], [], []];
    // the deck of cards
    this.deck = new this.Deck();
 
	this.moves_list = [];
	this.cards_left = 52;
};

/**
 * Initialise the game object.
 */
Game.prototype.init = function(game_num) {
    var card;

	this.cards_left = 52;
	
    // shuffle the deck
    this.deck.shuffle(game_num);

    for (var i = 0; i < 52; i++) {
        // add the cards to the columns
        card = this.deck.cards[i];
        this.columns[i % 8].push(card);
    }
    
};

/**
 * Reset the game
 */
Game.prototype.reset = function(game_num) {
    var i, col;

    this.free = [null, null, null, null];
    this.suits = [null, null, null, null];


    for (i = 0; i < 8; i++) {
        col = this.columns[i];
        col.length = 0;
    }

    this.init(game_num);
};


/**
 * Create an array of ids of the valid draggable cards.
 */
Game.prototype.valid_drag_ids = function() {
    var drag_ids, i, card, col, col_len, column_ids;

    drag_ids = [];

    // add cards in freecell spaces
    for (i = 0; i < 4; i++) {
        card = this.free[i];
        if (card !== null) {
            drag_ids.push([card.id.toString()]);
        }
    }
    // add cards at the bottom of columns
    for (i = 0; i < 8; i++) {
        col = this.columns[i];
        col_len = col.length;
        if (col_len > 0) {	
	        column_ids = [];		
            card = col[col_len - 1];
            column_ids.push(card.id.toString());
			
            //allow stacked column to be dragged, forming a 2-D array
			for(var  j = col_len - 1; j >0; j--) {
				if( (col[j].value + 1 === col[j-1].value) && (col[j].colour !== col[j-1].colour) )
				   column_ids.push(col[j-1].id.toString());
			    else
					break;
			}
			//push array with the stacked column
			drag_ids.push(column_ids.slice());
			
        }
    }
    return drag_ids;
};


/**
 * Create an array of ids of valid drop locations for the card. The ids are
 * the id attribute string in the DOM.
 */
Game.prototype.valid_drop_ids = function(card_id, stack_drag) {
    var drop_ids, i, free, suit_card, drag_card, bottom_cards, card, col;
    var free_cells, empty_columns;

     free_cells = 0;
	 empty_columns = 0;
     drop_ids = [];

    // the card being dragged   
    drag_card = this.deck.get_card(card_id);

	// add empty freecells
	for (i = 0; i < 4; i++) {
		free = this.free[i];
		if (free === null) {
			 if(!stack_drag)       //stack drag only allowed to other columns
			   drop_ids.push('free' + i.toString());
			free_cells++;
		}
	}

	if(!stack_drag)  {
		// add a valid suit cell (if any)
		for (i = 0; i < 4; i++) {
			suit_card = this.suits[i];
			if (suit_card === null) {
				// if the card being dragged is an ace then this is a valid drop
				if (drag_card.value === 1) {
					drop_ids.push('suit' + i.toString());
				}
			} else {
				// is the card being dragged the next in the suit sequence to the
				// card in the suit cell - then valid drop
				if ((drag_card.suit === suit_card.suit) &&
					(drag_card.value === suit_card.value + 1)) {
					drop_ids.push('suit' + i.toString());
				}
			}
		}
	}
	
    // add a valid card at the bottom of a column
    bottom_cards = this.col_bottom_cards();
    for (i = 0; i < bottom_cards.length; i++) {
        card = bottom_cards[i];

        if ((card.value === drag_card.value + 1) &&
            (card.colour !== drag_card.colour)) { 
            drop_ids.push(card.id.toString());
        }
    }

    // add an empty column as a valid drop location
    for (i = 0; i < 8; i++) {
        col = this.columns[i];
        if (col.length === 0) {
            drop_ids.push('col' + i.toString());
			empty_columns++;
        }
    }

    return [drop_ids, empty_columns, free_cells];
};

/*
 * Return an array of the cards that are at the bottom of columns
 */
Game.prototype.col_bottom_cards = function() {
    var i, col, card_count, bottom_cards;

    bottom_cards = [];

    for (i = 0; i < 8; i++) {
        col = this.columns[i];
        card_count = col.length;
        if (card_count > 0) {
            bottom_cards.push(col[card_count - 1]);
        }
    }

    return bottom_cards;
};

/**
 * Move a card to a new location
 *  drag_id is an integer
 *  drop_id is a string
 */
Game.prototype.move_card = function(drag_id, drop_id, undoing) {
    var drag_column, drag_card, col_index, i;

    // get the card from its current location
    drag_column = this.get_cards(drag_id);
	
	//stores every move for the undoing playback
	if(undoing==false) 
       this.moves_list.push({drag_column, drop_id});

	for(i=0; i<drag_column.length; i++)  {
		
		drag_card = drag_column[i];
		
		if (drop_id.length <= 2) {                         // dropping on another column
			// dropping this card on another column
			drop_id = parseInt(drop_id, 10);
			this.push_card(drag_card, drop_id);
		} else {
		   
			col_index = parseInt(drop_id.charAt(drop_id.length - 1), 10);
			if (drop_id.slice(0, 1) === 'f') {             //dropping on a freecell
				// dropping on a freecell
				this.free[col_index] = drag_card;
			} else if (drop_id.slice(0, 1) === 's') {    //dropping on a suit cell
				// dropping on a suit cell
				this.suits[col_index] = drag_card;    
				this.cards_left--;			  
			} else {                                            // dropping on an empty column
				this.columns[col_index].push(drag_card);
			}
		}

        drop_id = drag_card.id.toString();   //last drag_id becomes the new drop_id		
	}
};

/**
 * Return the array of cards object being moved
 * card_id is an integer.
 */
Game.prototype.get_cards = function(card_id) {
    var i, col, card, j;

    // check the freecells
    for (i = 0; i < 4; i++) {
        card = this.free[i];
        if ((card !== null) && (card.id === card_id)) {
            this.free[i] = null;
            return [card];
        }
    }
	
    // check each column
    for (i = 0; i < 8; i++) {
        col = this.columns[i];
        if (col.length === 0) {
            continue;
        }
		
		 // loop through the middle of each column
        for (j = col.length-1; j >=0; j--) {		
		    card = col[j];
            if (card.id === card_id)  {
    	        return col.splice(j, col.length);  //extract the stacked cards from the column array
		    }
        }
    }

    // shouldn't reach this point - should always find card
    alert('error in Game.get_cards() for card id: ' + card_id);
    return null;
};

/**
 * Push the card onto the end of a column based on the id of the bottom card
 */
Game.prototype.push_card = function(card, drop_id) {
    var i, col, col_len, bottom_card;

    for (i = 0; i < 8; i++) {
        col = this.columns[i];
        col_len = col.length;
        if (col_len === 0) {
            continue;
        }
        bottom_card = col[col.length - 1];
        if (bottom_card.id === drop_id) {
            col.push(card);
            return;
        }
    }
};

/**
 * Has the game been won?
 */
Game.prototype.is_game_won = function() {
    var i, card;

     if (this.cards_left===0)
		return true;
	else
        return false;
};

/******************************************************************************/

/**
 * Deck object - contains an array of Cards.
 */
Game.prototype.Deck = function() {
    var suits, values, colours, i, suit, value;

    suits = ['clubs', 'diamonds', 'hearts', 'spades'];
    values = [1, 2, 3, 4, 5, 6 ,7 ,8 ,9, 10, 11, 12, 13];
    colours = {'clubs': 'black',
    	             'diamonds': 'red',
    	             'hearts': 'red',
                     'spades': 'black'              
                    };
               
    this.cards = [];
    for (i = 0; i < 52; i++) {
        suit = suits[i % 4];
        value = values[Math.floor(i / 4)];
        this.cards.push(new this.Card(i + 1, suit, value, colours[suit]));
    }               
};

/**
 * shuffle the deck of cards
 */
Game.prototype.Deck.prototype.shuffle = function(rand) {
    var len, i, j, item_j;
    
    //sort cards ascending order
    this.cards.sort(function(a, b) {
        if (a.id < b.id) {
            return -1;
        }
        if (a.id > b.id) {
            return 1;
        }
        return 0;
    });
    //descendinge order - deal the cards in optimal order 
    this.cards.reverse();           

   /*
    * Microsoft Windows Freecell / Freecell Pro boards generation.
    * Change the cards order to match the random sequence generated
    * - http://rosettacode.org/wiki/Deal_cards_for_FreeCell*/    
    len = this.cards.length;
    var j, swap; 	  
    for (i = 0; i < len; i++) {
        rand = (rand * 214013 + 2531011) & 0x7FFFFFFF;
		j = 51 - (rand >> 16) % (52 - i);
		swap = this.cards[i], this.cards[i] = this.cards[j], this.cards[j] = swap;      
    }    
};


/**
 * Get the card by its id
 */
Game.prototype.Deck.prototype.get_card = function(card_id) {
    var i, card;

    for (i = 0; i < 52; i++) {
        card = this.cards[i];
        if (card_id === card.id) {
            return card;
        }
    }
    // only reach this if invalid card_id is supplied
    alert('error in Deck.get_card()');
    return null;
};

/******************************************************************************/

/**
 * Card object
 */
Game.prototype.Deck.prototype.Card = function(id, suit, value, colour) {
    this.id = id;
    this.suit = suit;
    this.value = value;
    this.colour = colour;
};

/**
 * The image name and location as a string. Used when creating the web page.
 */
Game.prototype.Deck.prototype.Card.prototype.image = function() {
    return 'images/' + this.id.toString() + '.png';
};

/******************************************************************************/

/**
 * The user interface
 */
var UI = function(game) {
    this.game = game;
    // an array of all the draggables
    this.drag = [];
    // an array of all the droppables
    this.drop = [];
	
	this.auto_complete = false;
};

/**
 * Initialise the user interface
 */
UI.prototype.init = function(game_num) {
    this.game.init(game_num);

    this.add_cards();

    // set up the win dialog
    this.win();
    // set up the new game button
    this.new_game();
    // set up the help dialog and button
    this.help();

    this.setup_secret();

    // initialise draggables
    this.create_draggables();
	
    this.undo(); 
	this.auto_drag_cb();
	this.moves_warning();
};

/**
 * Undo last move by reseting the game and playing back every move previously stored, but the last one
 */
UI.prototype.undo_move = function() {  

    //drops last move	 
    this.game.moves_list.pop();
	this.auto_complete = false;
	
	
	 //Reset game	
    var game_num = document.getElementById('game_num');
	this.game.reset(game_num.value);	 
    this.remove_cards();
    this.add_cards();
    this.create_draggables();

    //replays moves previously stored
    for(var i=0; i<this.game.moves_list.length; i++)
        this.replay_move(this.game.moves_list[i].drag_column, this.game.moves_list[i].drop_id, this);

  
    this.clear_drag()();
	this.auto_complete = document.getElementById('auto_drag').checked;
};


/**
 * Add cards to the user interface
 */
UI.prototype.add_cards = function() {
    var i, j, cards, num_cards, col_div, card, img, card_div;

    for (i = 0; i < 8; i++) {
        cards = this.game.columns[i];
        num_cards = cards.length;

        // get a reference to the column div
        col_div = document.getElementById('col' + i.toString());

        for (j = 0; j < num_cards; j++) {
            // add card divs to the column div
            card = cards[j];
            img = new Image();
            img.src = card.image();

            card_div = document.createElement('div');
            card_div.className = 'card';
            card_div.id = card.id;
            card_div.style.top = (25 * j).toString() + 'px';
            card_div.appendChild(img);

            col_div.appendChild(card_div);
        }
    }
};

/**
 * Remove the cards from the user interface
 */
UI.prototype.remove_cards = function() {
    var i;

    for (i = 0; i < 8; i++)
    {
        $('#col' + i.toString()).empty();
    }
};

/**
 * Create draggables: cards in the freecells and at the bottoms of all the
 * columns can be dragged.
 */
UI.prototype.create_draggables = function() {
    var card_ids, card_count, i, id, card_div, this_ui, j;

    this_ui = this;
    
	//Trys to auto-drag card if auto-complete is set
	if(this.auto_complete)
        this_ui.auto_drag();
    
    card_ids = this.game.valid_drag_ids();
    card_count = card_ids.length;

    //loop through draggable cards
    for (i = 0; i < card_count; i++) {

        //Loop through draggable cards in the middle of stacked columns
		var stack_cards_id = [];
        for (j = 0; j <  card_ids[i].length; j++) {
	 		
		    id = card_ids[i][j];
		    card_div = $('#' + id);
		   
		    //add to the list of draggables
            this_ui.drag.push(card_div);
		   
		    stack_cards_id.push(id);   //id list from cards tht have to be moved first
						 
            card_div.draggable({
                stack: '.card',     //controls the z-index of the set of elements that match the selector, always brings the currently dragged item to the front.
                containment: '#table',
                revert: 'invalid',   //revert will only occur if the draggable has not been dropped on a droppable	   			   
                revertDuration: 200,
                start: this_ui.create_droppables( stack_cards_id.slice() ),      	  
                stop: this_ui.clear_drag()   
            });	   
		    card_div.draggable('enable');
		   
			// add double-click event handling to draggables that are not in the middle of columns
			if(j==0)
				card_div.bind('dblclick', {this_ui: this_ui}, this_ui.dblclick_draggable);		   
		   
			//jQuery method to bind handlers for both mouseenter and mouseleave events.
			card_div.hover(
				// hover start
				function(event) {
					$(this).addClass('highlight');
				},
				// hover end
				function(event) {
					$(this).removeClass('highlight');
				}
			);				   	   		   
        }

        //Adjust stacked cards z-indices after a returned stack drag
		for(k = stack_cards_id.length-1 ; k >= 0; k--)  {		  
		    card_div = $('#' +  stack_cards_id[k]);
		    max_z = this_ui.card_max_zindex();
		    card_div.css('z-index', max_z + 1);
		}
    }
};

/**
 * When a draggable card is at the bottom of a column and it is double-clicked,
 * check if it can be moved to a foundation column or empty freecell. If it can,
 * then move it.
 */
UI.prototype.dblclick_draggable = function(event) {
    var this_ui, drop_ids, card_id, drop_len, i, drop_id, drop_div;
    this_ui = event.data.this_ui;

    // the valid drop locations for this card
    card_id = parseInt(this.id, 10);
    drop_ids = this_ui.game.valid_drop_ids(card_id)[0];
    drop_len = drop_ids.length;

    // can the card be moved to a suit cell
    for (i = 0; i < drop_len; i++) {
        drop_id = drop_ids[i];
        if (drop_id.substr(0, 4) === 'suit') {
            this_ui.animated_move(card_id, drop_id, this_ui);
            return;
        }
    }

    // can the card be moved to an empty freecell
    for (i = 0; i < drop_len; i++) {
        drop_id = drop_ids[i];
        if (drop_id.substr(0, 4) === 'free') {
            this_ui.animated_move(card_id, drop_id, this_ui);
            return;
        }
    }
};


/**
 * For every dragable card, check if it can be moved to a foundation column. 
 * If it can, then move it.
 * 
 */
UI.prototype.auto_drag = function() {
	
   var i, card_ids, card_count, card_id, card_div, this_ui, k;
    this_ui = this;
    
    card_ids = this_ui.game.valid_drag_ids();
    card_count = card_ids.length;

    //loop over every dragable card
    var j, k, suit_card, drag_card;
    for (i = 0; i < card_count; i++) {  	
		  
  	    card_id = parseInt(card_ids[i][0], 10); 
        drag_card = this.game.deck.get_card(card_id);
      
        //loop over the 4 suit cells
        for (j = 0; j < 4; j++) {
            suit_card = this.game.suits[j];
            if (suit_card === null) {
                // if the card being dragged is an ace then this is a valid drop
                if (drag_card.value === 1) {
                    this_ui.animated_move(card_id, 'suit' + j.toString(), this_ui);
                    return;
                }
            } 
            else {
                //is the dragable card the next in the same suit cell sequence?
                if ((drag_card.suit === suit_card.suit) &&
                   (drag_card.value === suit_card.value + 1)) {
               	
                   //we can auto drag, but should we?
			    	var do_drag = 0
				
				    if(drag_card.value === 2)
				    	do_drag = 2;
				
				    //check if the card could be still useful for the opposite colour columns stacking
			        for (k = 0; k < 4; k++) 
				        if(this.game.suits[k] != null)
				            if(this.game.suits[k].colour != suit_card.colour)
				     	        if(this.game.suits[k].value + 2>= drag_card.value)
				                    do_drag++;
				
                    if(do_drag>=2)  {					
                        this_ui.animated_move(card_id, 'suit' + j.toString(), this_ui);
                        return;  
                    }                         
                }
            }
        }   	     	  
    } 
   return;
};

/*replay a stored move for the undo*/
UI.prototype.replay_move = function(drag_column, drop_id, this_ui) {
    var offset_end, offset_current, drop_div, left_end, top_end, left_move,
        top_move, card, left_current, top_current, max_z;

	card_id = drag_column[0].id;
	card_div = $('#' + card_id);
	drop_div = $('#' + drop_id);
	offset_end = drop_div.offset();

	left_end = offset_end['left'];
	top_end = offset_end['top'];

    this_ui.game.move_card(card_id, drop_id, true);      // tell the game the card has moved
    document.getElementById('cards_left').innerHTML = "Cards left: " + this_ui.game.cards_left;
	
	// before moving the card, stack it on top of all other cards
	max_z = this_ui.card_max_zindex();
	card_div.css('z-index', max_z + 1);
		
	//loop through stacked dragged cards and graphically move cards
	for(var i=0; i<drag_column.length; i++)  {
		
        card_div = $('#' + drag_column[i].id);
			
		// repositioning cards	
	    if (drop_id.length <= 2)  // dropping this card on another card in column
		    card_div.offset({ top: top_end += 25, left: left_end });    // reposition card into a column 
	    else if (drop_id.charAt(0) === 'c')  {                  
		    card_div.offset({ top: top_end+1, left: left_end+1 }); // reposition card into an empty column
		    top_end += 25;
	    }
	    else 	   
		    card_div.offset({ top: top_end+3, left: left_end+3 });  // reposition card into suit or free position
	}
};

UI.prototype.animated_move = function(card_id, drop_id, this_ui) {
    var offset_end, offset_current, drop_div, left_end, top_end, left_move,
        top_move, card, left_current, top_current, max_z;

    card = $('#' + card_id);
    drop_div = $('#' + drop_id);
    offset_end = drop_div.offset();
    offset_current = card.offset();

    left_end = offset_end['left'];
    top_end = offset_end['top'];
    left_current = offset_current['left'];
    top_current = offset_current['top'];

    // add 3 for border
    left_move = left_end - left_current + 3;
    top_move = top_end - top_current + 3;

    // before moving the card, stack it on top of all other cards
    max_z = this_ui.card_max_zindex();
    card.css('z-index', max_z + 1);

    //jQuery animate() Method) 
    card.animate( {top: '+=' + top_move, left: '+=' + left_move},   //{styles - CSS properties/values to animate}
						{duration:200,  easing:"swing", complete:
						function() {                                                          // callback - executed asynchronously after the animation completes                                
								this_ui.game.move_card(card_id, drop_id, false);     // tell the game the card has moved
								document.getElementById('cards_left').innerHTML = "Cards left: " + this_ui.game.cards_left;
								this_ui.clear_drag()();              //clear_drag() returns another function
								this_ui.is_won();
								}
						 });
};


UI.prototype.card_max_zindex = function() {
    var max_z = 0;
    $('.card').each(function(i, el) {
        z_index = parseInt($(el).css('z-index'), 10);
        if (!isNaN(z_index) && z_index > max_z) {
            max_z = z_index;
        }
    });
    return max_z;
};

/**
 * Create droppables: when a card is dragged, decide where it can be dropped.
 * this method should be called when a card drag is started.
 *
 * This method should use Game methods to make decisions.
 *
 * use this as the callback for the start event of the drag. This is why it has
 * the two parameters (event, ui).
 * - changed to allow stacked columns drag/drop
 */
UI.prototype.create_droppables = function(stack_cards_id) {
    var this_ui;
    this_ui = this;

    var droppers = function(event, ui) {
        var drop_ids, i, drop_id, drag_id, drop_div;

        drag_id = parseInt($(this).attr('id'), 10);  //attr() method sets or returns attributes and values of the selected elements

		if(stack_cards_id.length<=1)    //is it stacked drag?
            drops = this_ui.game.valid_drop_ids(drag_id);
		else 
		    drops = this_ui.game.valid_drop_ids(drag_id, true);   //stacked drags can only be dropped in columns
	   
        drop_ids = drops[0];               //list of valid drops
		empty_columns = drops[1];      //number of empty columns
		free_cells = drops[2];              //number of free cells
		
        drag_orig_offset = $(this).offset();   //store original drag position, in case drop fails
		   
        for (i = 0; i < drop_ids.length; i++) {
            drop_id = drop_ids[i];
            drop_div = $('#' + drop_id.toString());
            // add to array of droppables
            this_ui.drop.push(drop_div);
			
			//executes as card is dropped
            drop_div.droppable({
				
                // callback for drop event
                drop: function(event, ui) {
                    var card_offset, this_id;
					
					//remove the upper non-dragged stacked cards from array
                    for(j=stack_cards_id.length-1; j>=0; j--) 
						if(drag_id!=parseInt(stack_cards_id[j], 10))
							stack_cards_id.pop();
						else
							break;			

                    this_id = $(this).attr('id');
					
					//calculates how many cards can be simulataneously moved
					if (this_id.charAt(0) === 'c')  // reposition card into an empty column
						simult_moves = Math.pow(2, empty_columns-1)*(free_cells+1);
					else
						simult_moves = Math.pow(2, empty_columns)*(free_cells+1);
					
					if(stack_cards_id.length > simult_moves)  {
					    document.getElementById('moves_warning').innerHTML = "That move requires moving " + stack_cards_id.length + " cards. You only have enough free space to move " + simult_moves + ".";
					    $('#moves_warning').dialog('open');

					    //manual return of failed drag
					    card_div = $('#' + drag_id);					   
					    offset_current = card_div.offset();
	   
					    left_end = drag_orig_offset['left'];
					    top_end = drag_orig_offset['top'];
					    left_current = offset_current['left'];
					    top_current = offset_current['top'];	
					    left_move = left_end - left_current;
					    top_move = top_end - top_current;	
					   
	                    //jQuery animate() Method
					    card_div.animate(  {top:'+=' + top_move, left: '+=' + left_move},   //{styles - CSS properties/values to animate}
						    {duration:200,  easing:"swing", complete:
							 function() { this_ui.clear_drop(); }                     // callback - executed after the animation completes     
						    });
					   
					    return;
					}

                    // tell the game that the card has been moved
                    this_ui.game.move_card(drag_id, this_id, false);
                    document.getElementById('cards_left').innerHTML = "Cards left: " + this_ui.game.cards_left;
					
                    // has the game been completed
                    this_ui.is_won();

                    // reset ui so that there are no droppables
                    this_ui.clear_drop();
					
					/**************** added for stack moving******************/
					offset_end = $(this).offset();
					left_end = offset_end['left'];
					top_end = offset_end['top'];
					
					//loop through stacked dragged cards and graphically move cards
					for(j=stack_cards_id.length-1; j>=0; j--)  {
				   					   
					    card_div = $('#' + stack_cards_id[j]);			
					   
					    // before moving the card, stack it on top of all other cards
                        max_z = this_ui.card_max_zindex();
                        card_div.css('z-index', max_z + 1);
							
					    if (this_id.length <= 2 )  // dropping this card on another card in column							
					        card_div.offset({ top: top_end += 25, left: left_end });    // reposition card below the last one
					    else if (this_id.charAt(0) === 'c') {     
                            card_div.offset({ top: top_end+1, left: left_end+1 });      // reposition card into an empty column
						    top_end += 25;
					    }
                        else {
                            card_div.offset({ top: top_end+3, left: left_end+3 });      // reposition card into free or suit cell
                        }						  
					}	
					/**************** added for stack moving******************/					
                }
            });
            drop_div.droppable('enable');
        }
    };

    return droppers;
};

/*
 * Clear all drag items
 */
UI.prototype.clear_drag = function() {
    var this_ui;
    this_ui = this;

    // dynamically sets table height based on longest column size
	var table_heigtht, i, max_col_length = 7;
    for (i = 0; i < 8; i++)
    {
       if(this_ui.game.columns[i].length >  max_col_length)
	        max_col_length = this_ui.game.columns[i].length;
    }
	table_heigtht = 520 + 25*(max_col_length-7);
	document.getElementById('table').style.height = table_heigtht.toString()+"px";

   
    return function(event, ui) {
        var i, item;
		
        for (i = 0; i < this_ui.drag.length; i++) {
        	
            item = this_ui.drag[i];
            // remove hover classes
            item.unbind('mouseenter').unbind('mouseleave');
            // force removal of highlight of cards that are dropped on the suit cells
            $(this).removeClass('highlight');
            // remove double-click handler
            item.unbind('dblclick');
            item.draggable('destroy');
        }
        // empty the draggable array
        this_ui.drag.length = 0;

        // empty the droppable array - this makes sure that drop array is
        // cleared after an invalid drop
        this_ui.clear_drop();

        // create new draggables
        this_ui.create_draggables();
    };
};

/**
 * Clear all droppables
 */
UI.prototype.clear_drop = function() {
    var i, item;

    for (i = 0; i < this.drop.length; i++) {
        item = this.drop[i];
        item.droppable('destroy');
        //item.droppable('disable');
    }
    // empty the droppably array
    this.drop.length = 0;
};

UI.prototype.is_won = function() {
    if (this.game.is_game_won()) {
        this.win_animation();
        $('#windialog').dialog('open');
        //return false;
    }
};

/**
 * Animate the cards at the end of a won game
 */
UI.prototype.win_animation = function() {
    var i, $card_div, this_ui, v_x;

    for (i = 0; i < 53; i++) {
        $card_div = $('#' + ((i + 4)%52 + 1));
        this_ui = this;
        v_x = 3 + 3*Math.random();

        // this is necessary for IE because you can't pass parameters to
        // function in setTimeout. So need to create a closure to bind
        // the variables.
        function animator($card_div, v_x, this_ui) {
            setTimeout(function() {
                this_ui.card_animation($card_div, v_x, 0, this_ui);
            }, 250*i);
        }
        animator($card_div, v_x, this_ui);
    }
};

/**
 * Animation of a single card
 */
UI.prototype.card_animation = function($card_div, v_x, v_y, this_ui) {
    var pos, top, left, bottom;

    pos = $card_div.offset();
    top = pos.top;
    left = pos.left;

    // calculate new vertical velocity v_y
    bottom = $(window).height() - 96; // 96 is height of card div
    v_y += 0.5; // acceleration
    if (top + v_y + 3 > bottom) {
        // bounce card at bottom, and add friction
        v_y = -0.75*v_y; // friction = 0.75
    }

    left -= v_x;
    top += v_y;
    $card_div.offset({top: top, left: left});
    if (left > -80) {
        // only continue animation if card is still visible
        setTimeout(function() {
            var cd = $card_div;
            this_ui.card_animation(cd, v_x, v_y, this_ui);
        }, 20);
    }
};

UI.prototype.setup_secret = function() {
    var this_ui = this;
    $('#secret').click(function() {
        this_ui.win_animation();
    });
};

/**
 * Show the win dialog box
 */
UI.prototype.win = function() {
    $('#windialog').dialog({
        title: 'Freecell',
        modal: true,
        show: 'blind',
        autoOpen: false,
        zIndex: 5000
    });
};

/**
 * Show the simultaneous moves warning dialog box
 */
UI.prototype.moves_warning = function() {
    $('#moves_warning').dialog({
        title: 'Freecell',
        modal: true,
        show: 'blind',
        autoOpen: false,
        zIndex: 5000
    });
};

/**
 * The help dialog
 */
UI.prototype.help = function() {
    $('#helptext').dialog({
        title: 'Help',
        modal: true,
        show: 'blind',
        autoOpen: false,
        zIndex: 5000,
        minWidth: 550
    });

    $('#help').click(function() {
        $('#helptext').dialog('open');
    });

};

UI.prototype.new_game = function() {
    var this_ui = this;
    $('#newgame').click(function() {
	   
	    this_ui.game.moves_list = []; 
	   	document.getElementById('cards_left').innerHTML = "Cards left: 52";
         var game_num = document.getElementById('game_num');
        this_ui.game.reset(game_num.value);
        this_ui.remove_cards();
        this_ui.add_cards();
        this_ui.create_draggables();

    });
};

UI.prototype.undo = function() {
    var this_ui = this;
    $('#undo').click(function() {
        this_ui.undo_move();
    });
};

UI.prototype.auto_drag_cb = function() {
    var this_ui = this;
    $('#auto_drag').click(function() {
		this_ui.auto_complete = document.getElementById('auto_drag').checked;
		
		if(this_ui.auto_complete)
		    this_ui.auto_drag();
    });
};

/******************************************************************************/

var my_ui;
$(document).ready(function() {
    var g;

    g = new Game();
    my_ui = new UI(g);
	
	var game_num = document.getElementById('game_num');
	game_num.value = Math.floor(32000 * Math.random());
    my_ui.init(game_num.value);
});
