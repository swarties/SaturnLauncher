# Do this...

### Event Related

- Added logs events to start game( "game:info" and "game:error" )
- added a game:started and game:stopped events that also pass the folderId. 
 game:stopped also passes the exit code to determine if the game crashed or exited normally

### Fabric Related

- Added an InstallFabric function that takes a folderId and a loaderVersion(we get that from the follow function)
- Added GetFabricLoaders which return a slice of fabric loader versions compatible with the instance's game version
- Added UninstallFabric does what it says


### Instance Related

- Added an OpenInstanceFolder function
- Added PickInstanceIcon call it before SetInstanceIcon and pass the path it returns to that function (check if path is empty ( happens when user closes file manager without choosing a file ))
- Added UpdateInstanceDescription that updates an Instance's description ( takes folderId and description )
- Added SetInstanceIcon (takes a folderId and a path to the image returns the image encoded in base64 string)
- Added GetInstanceIcon returns the instances icon in base64( maybe find a way to cache this ? )

### Content Related

- Added InstallContent takes a folderid and contenttype( "mods", "resourcepacks" and "shaders" ) the contenttype is case sensitive. does what it says copies the selected file to the appropriate location
- Added GetInstalledContent takes the contentType and folderId and returns a slice of all the names of the content in the folder ( to be upgraded soon to be more precise )
- Added RemoveContent takes a folderId, contentType and the files name and deletes it (careful if the file contains / \\ or .. it'll return an error)
