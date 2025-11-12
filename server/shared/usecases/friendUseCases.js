class FriendUseCases {
  constructor({ friendService }) {
    this.friendService = friendService;
  }

  sendRequest(userId, toUserId) {
    return this.friendService.sendRequest(userId, toUserId);
  }

  acceptRequest(requestId, userId) {
    return this.friendService.acceptRequest(requestId, userId);
  }

  getRequests(userId) {
    return this.friendService.listRequests(userId);
  }

  getFriends(userId) {
    return this.friendService.listFriends(userId);
  }
}

module.exports = FriendUseCases;
