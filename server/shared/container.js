const dbClient = require('../core/dbClient');
const tokenService = require('../core/tokenService');

const UserRepository = require('./repositories/userRepository');
const FriendshipRepository = require('./repositories/friendshipRepository');
const RoomRepository = require('./repositories/roomRepository');
const MessageRepository = require('./repositories/messageRepository');
const FileRepository = require('./repositories/fileRepository');

const AuthService = require('./services/authService');
const UserService = require('./services/userService');
const FriendService = require('./services/friendService');
const RoomService = require('./services/roomService');
const ChatService = require('./services/chatService');
const FileService = require('./services/fileService');
const CallService = require('./services/callService');

const AuthUseCases = require('./usecases/authUseCases');
const UserUseCases = require('./usecases/userUseCases');
const FriendUseCases = require('./usecases/friendUseCases');
const RoomUseCases = require('./usecases/roomUseCases');
const ChatUseCases = require('./usecases/chatUseCases');
const FileUseCases = require('./usecases/fileUseCases');
const CallUseCases = require('./usecases/callUseCases');

const repositories = {
  userRepository: new UserRepository(dbClient),
  friendshipRepository: new FriendshipRepository(dbClient),
  roomRepository: new RoomRepository(dbClient),
  messageRepository: new MessageRepository(dbClient),
  fileRepository: new FileRepository(dbClient)
};

const services = {
  authService: new AuthService({ userRepository: repositories.userRepository, tokenService }),
  userService: new UserService({ userRepository: repositories.userRepository }),
  friendService: new FriendService({ friendshipRepository: repositories.friendshipRepository, userRepository: repositories.userRepository }),
  roomService: new RoomService({ roomRepository: repositories.roomRepository, userRepository: repositories.userRepository }),
  chatService: new ChatService({ messageRepository: repositories.messageRepository, fileRepository: repositories.fileRepository, roomService: null }),
  fileService: new FileService({ fileRepository: repositories.fileRepository }),
  callService: null
};

services.chatService.roomService = services.roomService;
services.callService = new CallService({ roomService: services.roomService });

const usecases = {
  auth: new AuthUseCases({ authService: services.authService }),
  user: new UserUseCases({ userService: services.userService }),
  friend: new FriendUseCases({ friendService: services.friendService }),
  room: new RoomUseCases({ roomService: services.roomService }),
  chat: new ChatUseCases({ chatService: services.chatService }),
  file: new FileUseCases({ fileService: services.fileService }),
  call: new CallUseCases({ callService: services.callService })
};

module.exports = {
  dbClient,
  tokenService,
  repositories,
  services,
  usecases
};
