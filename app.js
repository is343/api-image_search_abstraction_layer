const express = require("express"),
          app = express(),
        axios = require("axios"),
     mongoose = require('mongoose');
    


mongoose.connect(process.env.DATABASEURL, {useMongoClient: true});

var imageSearchAbstractionSchema = new mongoose.Schema({
   search_term: String,
   when: Date
});

var imageSearchAbstraction = mongoose.model('imageSearchAbstraction', imageSearchAbstractionSchema);

const client_id = process.env.CLIENT_ID;
var searchHistory = [];


app.get('/', function(req, res) {
    res.json({
      userStories: [
          '1) I can get the image URLs, alt text and page urls for a set of images relating to a given search string.',
          '2) I can paginate through the responses by adding a ?offset=2 parameter to the URL.',
          '3) I can get a list of the most recently submitted search strings.'
          
        ],
      exampleUsage: [
          {'1)': 'https://cute-time.glitch.me/search/dogs and cats'},
          {'2)': 'https://cute-time.glitch.me/search/mountains?offset=1'},
          {'3)': 'https://cute-time.glitch.me/latest'}
          ],
      exampleOutput: [
          {'1)': 'searches unsplash.com for images of dogs and cats'},
          {'2)': 'displays the second page (images 11-20) of pictures of mountains'},
          {'3)': 'displays the 10 most recent searches'}
        ]
  }); 
});

// get latest search history
app.get('/latest', function(req, res) { // sorts be date, and limits search to 10
    imageSearchAbstraction.find().sort({ when: -1 }).limit(10).exec(function(err, data){
        if(err){
            console.log('MongoDB lookup error');
        } else {
            var parsed = data.map(function(history){ // map to only give useful info
                return { search_term : history.search_term,
                         when : history.when
                    };
            });
            res.send(parsed);
        }
    });
});

// search for photos
app.get('/search/:search', function(req, res){
    var page = req.query.offset + 1;
    var search = req.params.search;
    var url = 'https://api.unsplash.com/search/photos';
    updateHistory(search);
    axios.get(url,{
        params:{
            client_id: client_id,
            query: search,
            page: page, 
            per_page: 10 // optional
        }
    })
    .then(function(response){
        var parsedData = parseUnsplashData(response.data);
        res.send(parsedData);
    })
    .catch(handleError);
});





// MAIN FUNCTIONS

function handleError(err) {
    if(err.response){
        console.log('Error: Problem with response:', err.response.status);
    } else if (err.request){
        console.log('Error: Problem with request');
    } else {
        console.log('Error:', err.message);
    }
}

function updateHistory(search){
    // str ==> ---
    // updates the search history as users search for photos
    var date = new Date();
    
    imageSearchAbstraction.create({
        search_term: search,
        when: date
    });
}


function parseUnsplashData(data){
    // obj ==> obj
    // takes in the raw data from unsplash and outputs only the needed info
    var parsedData = [];
    data.results.forEach(function(datum){
        let together = {
            description : datum['description'],
            full : datum.urls.full,
            regular : datum.urls.regular,
            thumb : datum.urls.thumb,
            main_page : datum.links.html
        };
        parsedData.push(together);
    });
    return parsedData;
}

// LISTEN FOR REQUESTS
var listener = app.listen(process.env.PORT, function () {
  console.log('App is listening on port ' + listener.address().port);
});
