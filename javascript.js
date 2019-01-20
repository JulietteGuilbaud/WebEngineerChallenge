//true if client already ask for something
var alreadyAsk = false;
//true if client already add this in fav
var isFav;

//true if browser supports Storage 
var hasStorage;

var ITEM = "Toronto.Waste.Fav";

var GREY = "rgb(184, 184, 184)";
var GREEN = "rgb(3, 148, 81)";

function initEventHandlers(){

    hasStorage = (typeof(Storage) !== "undefined");

    // Display Favourites
    var list = readFromDB();
    for (var i in list) {
        //add in Fav html
        addInHtml(list[i].item, list[i].category, list[i].info, list[i].id,".favourites");
    }    
    
    //clickListener when click or enter pressed
    $("#btn").click(function(){clickListener()});
    $("#input").bind('keypress', function(e) {
        var key = e.which || e.keyCode;
        if (key === 13) { // 13 is enter
          clickListener();
        }
    });
    
    //empty section when back space is pressed
    $('#input').on('keydown', function() {
        var key = event.keyCode || event.charCode;
        if( key == 8 || key == 46 ){
            $("section").empty();
        }
    });

    
    //scrollToTopListener
    $(window).scroll(function() {
            if ($(this).scrollTop() >= 50) {// If page is scrolled more than 50px
                $('#return-to-top').fadeIn(200);
            } else {
                $('#return-to-top').fadeOut(200);
            }
        });
        $('#return-to-top').click(function() {// When arrow is clicked
            $('body,html').animate({scrollTop : 0}, 500);
        });
}


//when click or enter pressed -> search word
function clickListener(){
    var word = $('#input').val().toLowerCase();
    
    if(alreadyAsk){
        $("section").empty();
    }
    alreadyAsk = true;
    
    if(word != ""){
        $.getJSON('https://secure.toronto.ca/cc_sr_v1/data/swm_waste_wizard_APR?limit=1000', function(data) {
            searchWord(data,word);
        });
    } else { $("section").append("<h2>Search field is empty.</h2>"); }
}


//search word in json, if found add in html
function searchWord(data,word){
    var found = false; //true if word is found
    
    var id=0;
    //search word in each item 
    $.each(data, function(i, v) {
        id++;
        if ((v.keywords).search(word) != -1) {
            found = true;
        
            var str = v.keywords.split(',');
            var text = "";
            
            //search exactly where
            for(var i=0; i<str.length; i++){
                if(str[i].search(word) != -1){
                    text += str[i] + ",";
                }
            }
            
            //add in html removing last ','
            addInHtml(text.substring(0,text.length-1), v.category,  $("<span />", { html: v.body }).text(), id,"section");
        }
    });
   
    if(!found){ $("section").append('<h2>No Results Found</h2>'); }
           
}


function addInHtml(item, category, info, id, section){

    var favourite = section == ".favourites";
    if (favourite) id = id+'F'; // change id to avoid 2 items with the same id (add F in favourites)
    
    var object = "<div class='card' id='"+id+"'><div class='itemTitle'><div class='star'><i class='fas fa-star' id='"+id+"star"+"'></i></div><h4>"
        +item+"</h4></div><div class='itemInfo'><div class='bin'><img class='binImg' alt=category +'bin' src='images/"
        +category+".png'></img><p class='binTitle'>"+category+"</p></div><div class='infos'>"+info+"</div></div></div>";
    
    $(section).append(object);
    
    //if is fav
    if(favourite){
        $('#'+id+'star').css("color", GREEN);
    } else {
        //Check if the id is in DB => change star in green
        if (isInDB(id)) $('#'+id+'star').css("color", GREEN); 
    }

    addFavListener(id, item, category, info);
}


function addFavListener(id, item, category, info){
    $('#'+id+'star').click(function(){
        //read id 
        var id = $(this).attr('id').slice(0,-4);//remove 'star'
        var color = $(this).css( "color" );
        var inFav = id[id.length-1] == "F"; // check if it is in favourites section
        if (inFav) id = id.substr(0,id.length-1);
        
        if(color == GREY ) {//add to fav
            $(this).css("color", GREEN);
            addInHtml(item, category, info, id, ".favourites");
            addinDB(id,item,category,info);
            
        } else {//remove from fav
            $(this).css("color", GREY);
            if (inFav) {
                $(".fas[id='"+id+"star']").css("color", GREY); // put the star in grey in the search section
            }
            $( ".favourites .card[id='"+id+"F']" ).remove(); // remove the card in favourites section
            removeFromDB(id);
        }
     });
}

// Remove one item from the DB
function removeFromDB(id) {
    var list = readFromDB();
    for (var i in list) {
        if (list[i].id == id) {
            list.splice(i,1); // remove the elem
            break;
        }
    }
    writeInDB(list);
}

function isInDB(id) {
    var list = readFromDB();
    for (var i in list) {
        if (list[i].id == id) {
            return true;
        }
    }
    return false;
}

function addinDB(id,item,category,info) {
    var list = readFromDB();
    for (var i in list) {
        if (list[i].id == id) { // already in db
            list.splice(i,1); // remove the elem
            break;
        }
    }
    list.push({"id":id,"item":item,"category":category,"info":info});
    writeInDB(list);
}

// Return the list for favourites
function readFromDB() {
    if (hasStorage) {
        //read favs
        var favs = localStorage.getItem(ITEM);
        if(favs == null || favs == undefined || favs == "") {
            return [];
        }
        var list = [];
        //split each item card
        var tabFavs = favs.split('*');    
        for(var i=0;i<tabFavs.length-1;i++){
            //split each info of an item
            var tabStr = tabFavs[i].split('|');
            if (tabStr.length == 4) {  
                var id = tabStr[0];
                var item = tabStr[1];
                var category = tabStr[2];
                var info = tabStr[3];
                list.push({"id":id,"item":item,"category":category,"info":info});
            }
        }
        return list;
    }
}

// Write the list of favourites in DB
function writeInDB(list) {
    if (hasStorage) {
        var favs = "";
        for (var i in list) {
            favs += list[i].id+"|"+list[i].item+"|"+list[i].category+"|"+list[i].info+"*";
        }
        //store in DB
        localStorage.setItem(ITEM,favs);
    }
}


window.addEventListener("load",initEventHandlers,false);
