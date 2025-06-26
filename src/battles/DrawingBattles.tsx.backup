import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { Canvas } from '@/engines/drawing/ProfessionalCanvas';
import { analytics } from '@/analytics/AnalyticsEngine';
import { profileSystem } from '@/engines/user/ProfileSystem';

interface Battle {
  id: string;
  theme: string;
  timeLimit: number;
  opponent: {
    id: string;
    name: string;
    avatar: string;
    elo: number;
  };
  status: 'waiting' | 'active' | 'voting' | 'completed';
  startTime: number;
  submissions: {
    [userId: string]: {
      artwork: string;
      votes: number;
    };
  };
}

export const DrawingBattles: React.FC = () => {
  const [currentBattle, setCurrentBattle] = useState<Battle | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Matchmaking system
  const findOpponent = async () => {
    setIsSearching(true);
    analytics.track('battle_search_started');
    
    // Simulate matchmaking with ELO
    const currentUser = profileSystem.getCurrentUser();
    const userElo = currentUser?.stats?.elo || 1200;
    
    // In production, this would connect to real-time matchmaking
    setTimeout(() => {
      const mockOpponent = {
        id: 'opponent_' + Date.now(),
        name: 'ArtMaster' + Math.floor(Math.random() * 999),
        avatar: '🎨',
        elo: userElo + Math.floor(Math.random() * 200 - 100)
      };
      
      const battle: Battle = {
        id: 'battle_' + Date.now(),
        theme: getRandomTheme(),
        timeLimit: 120, // 2 minutes
        opponent: mockOpponent,
        status: 'waiting',
        startTime: Date.now() + 5000, // 5 second countdown
        submissions: {}
      };
      
      setCurrentBattle(battle);
      setIsSearching(false);
      startBattleCountdown();
      
      analytics.track('battle_matched', {
        opponentElo: mockOpponent.elo,
        theme: battle.theme
      });
    }, 2000);
  };

  const startBattleCountdown = () => {
    // Animated countdown
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };

  const getRandomTheme = () => {
    const themes = [
      "Dragon in the clouds",
      "Underwater castle",
      "Robot eating ice cream",
      "Dancing vegetables",
      "Superhero cat",
      "Magical forest at night",
      "Alien vacation",
      "Time-traveling bicycle"
    ];
    return themes[Math.floor(Math.random() * themes.length)];
  };

  // Timer management
  useEffect(() => {
    if (currentBattle?.status === 'active') {
      const interval = setInterval(() => {
        const elapsed = Date.now() - currentBattle.startTime;
        const remaining = Math.max(0, currentBattle.timeLimit * 1000 - elapsed);
        setTimeRemaining(Math.floor(remaining / 1000));
        
        if (remaining === 0) {
          endBattle();
        }
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [currentBattle]);

  const endBattle = () => {
    if (currentBattle) {
      setCurrentBattle({
        ...currentBattle,
        status: 'voting'
      });
      
      analytics.track('battle_completed', {
        battleId: currentBattle.id,
        theme: currentBattle.theme
      });
      
      // Simulate voting phase
      setTimeout(() => {
        showBattleResults();
      }, 5000);
    }
  };

  const showBattleResults = () => {
    setShowResults(true);
    
    // Calculate ELO changes
    const won = Math.random() > 0.5; // In production, based on actual votes
    const eloChange = calculateEloChange(won);
    
    analytics.track('battle_result', {
      won,
      eloChange,
      votes: Math.floor(Math.random() * 100)
    });
  };

  const calculateEloChange = (won: boolean): number => {
    const K = 32; // ELO K-factor
    const expectedScore = 0.5; // Simplified
    const actualScore = won ? 1 : 0;
    return Math.round(K * (actualScore - expectedScore));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {!currentBattle && !isSearching && (
        <View style={styles.menuContainer}>
          <Text style={styles.title}>Drawing Battles</Text>
          <Text style={styles.subtitle}>Compete in real-time drawing challenges!</Text>
          
          <TouchableOpacity style={styles.battleButton} onPress={findOpponent}>
            <Text style={styles.battleButtonText}>Find Opponent ⚔️</Text>
          </TouchableOpacity>
          
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>Your ELO: 1247</Text>
            <Text style={styles.statsText}>Win Rate: 64%</Text>
            <Text style={styles.statsText}>Battles Won: 23</Text>
          </View>
        </View>
      )}
      
      {isSearching && (
        <View style={styles.searchingContainer}>
          <Animated.View style={[
            styles.searchingAnimation,
            {
              transform: [{
                rotate: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg']
                })
              }]
            }
          ]}>
            <Text style={styles.searchingEmoji}>🎨</Text>
          </Animated.View>
          <Text style={styles.searchingText}>Finding worthy opponent...</Text>
        </View>
      )}
      
      {currentBattle && currentBattle.status === 'active' && (
        <View style={styles.battleContainer}>
          <View style={styles.battleHeader}>
            <Text style={styles.themeText}>{currentBattle.theme}</Text>
            <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
          </View>
          
          <View style={styles.canvasContainer}>
            <Canvas 
              width="100%" 
              height="100%"
              onStrokeEnd={(artwork) => {
                // Auto-save artwork
                if (currentBattle) {
                  currentBattle.submissions[profileSystem.getCurrentUser()?.id || ''] = {
                    artwork,
                    votes: 0
                  };
                }
              }}
            />
          </View>
          
          <View style={styles.opponentInfo}>
            <Text style={styles.opponentText}>
              vs {currentBattle.opponent.name} ({currentBattle.opponent.elo})
            </Text>
          </View>
        </View>
      )}
      
      {currentBattle && currentBattle.status === 'voting' && (
        <View style={styles.votingContainer}>
          <Text style={styles.votingText}>Voting in progress...</Text>
          <Text style={styles.votingSubtext}>Community is choosing the winner!</Text>
        </View>
      )}
      
      <Modal visible={showResults} transparent animationType="slide">
        <View style={styles.resultsModal}>
          <Text style={styles.resultTitle}>Battle Complete!</Text>
          <Text style={styles.resultText}>You Won! 🎉</Text>
          <Text style={styles.resultElo}>+25 ELO</Text>
          <TouchableOpacity 
            style={styles.playAgainButton}
            onPress={() => {
              setShowResults(false);
              setCurrentBattle(null);
            }}
          >
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 40
  },
  battleButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10
  },
  battleButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  statsContainer: {
    marginTop: 40,
    alignItems: 'center'
  },
  statsText: {
    fontSize: 16,
    color: '#aaa',
    marginVertical: 5
  },
  searchingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchingAnimation: {
    marginBottom: 20
  },
  searchingEmoji: {
    fontSize: 60
  },
  searchingText: {
    fontSize: 18,
    color: '#fff'
  },
  battleContainer: {
    flex: 1
  },
  battleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#111'
  },
  themeText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold'
  },
  timerText: {
    fontSize: 24,
    color: '#ff4444',
    fontWeight: 'bold'
  },
  canvasContainer: {
    flex: 1
  },
  opponentInfo: {
    padding: 10,
    backgroundColor: '#111',
    alignItems: 'center'
  },
  opponentText: {
    color: '#888'
  },
  votingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  votingText: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 10
  },
  votingSubtext: {
    fontSize: 16,
    color: '#888'
  },
  resultsModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  resultTitle: {
    fontSize: 28,
    color: '#fff',
    marginBottom: 20
  },
  resultText: {
    fontSize: 36,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 10
  },
  resultElo: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 40
  },
  playAgainButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25
  },
  playAgainText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  }
});
