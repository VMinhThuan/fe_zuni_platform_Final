import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

// src/components/slide/SlideData.ts
const slides = [
  {
    id: 1,
    title: "Gọi video ổn định",
    description: "Trò chuyện thật đã với hình ảnh sắc nét, tiếng chất, âm chuẩn dưới mọi điều kiện mạng",
    image: require('../../assets/images/video_call.png'),
  },
  {
    id: 2,
    title: "Chat nhóm tiện lợi",
    description: "Cùng trao đổi, giữ liên lạc với gia đình, bạn bè và đồng nghiệp mọi lúc mọi nơi",
    image: require('../../assets/images/group_chat.png'),
  },
  {
    id: 3,
    title: "Gửi ảnh nhanh chóng",
    description: "Chia sẻ hình ảnh chất lượng cao với bạn bè và người thân nhanh chóng và dễ dàng",
    image: require('../../assets/images/image_share.png'),
  },
  {
    id: 4,
    title: "Nhật ký bạn bè",
    description: "Nơi cập nhật hoạt động mới nhất của những người bạn quan tâm",
    image: require('../../assets/images/friendtime_line.png'),
  },
];


const MainScreen = ({ navigation }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextSlide = (currentSlideIndex + 1) % slides.length;
      setCurrentSlideIndex(nextSlide);
      scrollRef.current?.scrollTo({ x: width * nextSlide, animated: true });
    }, 3000);

    return () => clearInterval(interval);
  }, [currentSlideIndex]);

  const onScroll = (event) => {
    const slideIndex = Math.round(
      event.nativeEvent.contentOffset.x / width
    );
    setCurrentSlideIndex(slideIndex);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.logo}>Zalo</Text>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width }]}>
            <Image source={slide.image} style={styles.image} />
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.description}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              currentSlideIndex === index && styles.activeDot,
            ]}
          />
        ))}
      </View>

      {/* Login and Sign Up Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('LoginScreen')}
        >
          <Text style={styles.buttonText}>Đăng nhập</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.signupButton}
          onPress={() => navigation.navigate('RegisterScreen')}
        >
          <Text style={styles.signupText}>Tạo tài khoản mới</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flexGrow: 0,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#0078FF',
    textAlign: 'center',
    marginTop: 40,
    position: 'absolute',
    alignSelf: 'center',
  },
  image: {
    width: 300,
    marginTop: 150,
    height: 300,
    resizeMode: 'contain',
    marginVertical: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 10,
  },
  description: {
    fontSize: 14,
    color: '#6b6b6b',
    textAlign: 'center',
    marginBottom: 30,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#0078FF',
  },
  buttonContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 20,
  },
  loginButton: {
    backgroundColor: '#0078FF',
    borderRadius: 25,
    width: '80%',
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    width: '80%',
    padding: 15,
    alignItems: 'center',
  },
  signupText: {
    color: '#0078FF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MainScreen;
