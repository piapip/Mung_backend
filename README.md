#Data Collection for SLU Task 

To use this application, 

1. Make dev.js file inside config folder
2. Put mongoDB info into dev.js file:
```bash
module.exports = {
    mongoURI: 'mongodb://localhost:27017/data-collection'
}
``` 
3. Type  " npm install " inside the root directory  ( Download Server Dependencies ) 
4. Type " npm install " inside the client directory ( Download Front-end Dependencies )
5. In root directory, type ~~"npm run dev" to launch app or~~ "npm run backend" to run backend :p 


I don't know how to refactor code in socket file...
I don't know how to test the room slotting feature by myself... can't create a 3rd accounts to do this for me. (Need to work on the signaling too, telling em that the room is already full).
