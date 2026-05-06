// Sample data for Call Requests

export const sampleCallRequests = {
  pending: [
    {
      id: '1',
      user: {
        name: 'Alex Johnson',
        avatar: 'https://i.pravatar.cc/150?img=1',
        isVerified: true,
      },
      requestTime: '2 mins ago',
      duration: '30 mins',
      coins: 600,
    },
    {
      id: '2',
      user: {
        name: 'Sarah Miller',
        avatar: 'https://i.pravatar.cc/150?img=5',
        isVerified: true,
      },
      requestTime: '5 mins ago',
      duration: '30 mins',
      coins: 600,
    },
    {
      id: '3',
      user: {
        name: 'David Chen',
        avatar: 'https://i.pravatar.cc/150?img=12',
        isVerified: false,
      },
      requestTime: '15 mins ago',
      duration: '1 hr',
      coins: 800,
    },
  ],

  scheduled: [
    {
      id: '4',
      user: {
        name: 'Sarah Miller',
        avatar: 'https://i.pravatar.cc/150?img=5',
        isVerified: true,
      },
      scheduledTime: 'Today, 4:30 PM',
      timeRemaining: '30 mins',
      duration: '30 mins',
      potentialEarnings: '600 Coins',
      status: 'upcoming',
    },
    {
      id: '5',
      user: {
        name: 'Sarah Miller',
        avatar: 'https://i.pravatar.cc/150?img=5',
        isVerified: true,
      },
      scheduledTime: 'Today, 4:30 PM',
      timeRemaining: '30 mins',
      duration: '30 mins',
      potentialEarnings: '600 Coins',
      status: 'upcoming',
    },
  ],

  completed: [
    {
      id: '6',
      user: {
        name: 'Sarah Miller',
        avatar: 'https://i.pravatar.cc/150?img=5',
        isVerified: true,
      },
      completedDate: 'Oct 20 • 30 mins',
      earnings: '600 COINS',
      earningsColor: '#4CAF50',
    },
    {
      id: '7',
      user: {
        name: 'Sarah Miller',
        avatar: 'https://i.pravatar.cc/150?img=5',
        isVerified: true,
      },
      completedDate: 'Oct 20 • 30 mins',
      earnings: '600 COINS',
      earningsColor: '#4CAF50',
    },
    {
      id: '8',
      user: {
        name: 'Sarah Miller',
        avatar: 'https://i.pravatar.cc/150?img=5',
        isVerified: true,
      },
      completedDate: 'Oct 20 • 30 mins',
      earnings: '600 COINS',
      earningsColor: '#4CAF50',
    },
  ],

  missed: [
    {
      id: '9',
      user: {
        name: 'Sarah Miller',
        avatar: 'https://i.pravatar.cc/150?img=5',
        isVerified: true,
      },
      missedDate: 'Oct 20 • 30 mins',
      earnings: '600 COINS',
      earningsColor: '#F44336',
    },
    {
      id: '10',
      user: {
        name: 'Sarah Miller',
        avatar: 'https://i.pravatar.cc/150?img=5',
        isVerified: true,
      },
      missedDate: 'Oct 20 • 30 mins',
      earnings: '600 COINS',
      earningsColor: '#F44336',
    },
  ],
};
