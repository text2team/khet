// Blog Loader - Tự động load bài đăng từ GitHub API
class BlogLoader {
    constructor() {
        this.repoOwner = 'text-2'; // Thay bằng username GitHub của bạn
        this.repoName = 'khet'; // Tên repository
        this.postsPath = 'post';
        this.maxPosts = 3;
        this.blogContainer = document.getElementById('blog-posts-container');
    }

    async loadPosts() {
        try {
            // Lấy danh sách file từ thư mục post
            const files = await this.getPostFiles();
            
            // Lọc và sắp xếp file theo thời gian tạo
            const sortedFiles = this.sortFilesByDate(files);
            
            // Lấy 3 file mới nhất
            const latestFiles = sortedFiles.slice(0, this.maxPosts);
            
            // Load nội dung của từng file
            const posts = await Promise.all(
                latestFiles.map(file => this.loadPostContent(file))
            );
            
            // Hiển thị bài đăng
            this.displayPosts(posts);
            
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showFallbackPosts();
        }
    }

    async getPostFiles() {
        const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.postsPath}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const files = await response.json();
        return files.filter(file => file.type === 'file' && file.name.endsWith('.html'));
    }

    sortFilesByDate(files) {
        return files.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return dateB - dateA; // Sắp xếp giảm dần (mới nhất trước)
        });
    }

    async loadPostContent(file) {
        const response = await fetch(file.download_url);
        const content = await response.text();
        
        // Parse HTML content để lấy title, subtitle, excerpt, và thumbnail
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        
        const title = doc.querySelector('h1')?.textContent || 'Không có tiêu đề';
        const subtitle = doc.querySelector('h2')?.textContent || '';
        const excerpt = doc.querySelector('p')?.textContent || '';
        const date = doc.querySelector('p:last-child')?.textContent || '';
        
        // Lấy thumbnail từ img tag hoặc og:image meta tag
        let thumbnail = '';
        const imgTag = doc.querySelector('img.post-thumbnail');
        if (imgTag && imgTag.src) {
            thumbnail = imgTag.src;
        } else {
            const ogImage = doc.querySelector('meta[property="og:image"]');
            if (ogImage && ogImage.content) {
                thumbnail = ogImage.content;
            }
        }
        
        return {
            title,
            subtitle,
            excerpt,
            date,
            thumbnail,
            filename: file.name,
            created_at: file.created_at,
            category: this.getCategoryFromFilename(file.name)
        };
    }

    getCategoryFromFilename(filename) {
        if (filename.includes('tin-tuc') || filename.includes('news')) {
            return { name: 'Tin tức', color: 'red' };
        } else if (filename.includes('he-sinh-thai') || filename.includes('ecosystem')) {
            return { name: 'Hệ sinh thái', color: 'blue' };
        } else if (filename.includes('doi-tac') || filename.includes('partner')) {
            return { name: 'Đối tác', color: 'green' };
        } else {
            return { name: 'Bài viết', color: 'gray' };
        }
    }

    displayPosts(posts) {
        if (!this.blogContainer) return;

        if (posts.length === 0) {
            this.blogContainer.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-newspaper text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-600">Chưa có bài đăng nào</p>
                </div>
            `;
            return;
        }

        const postsHTML = posts.map((post, index) => `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-all duration-300 cursor-pointer blog-post-card" data-aos="fade-up" data-aos-delay="${index * 100}" data-post-url="${this.getPostUrl(post.filename)}">
                ${post.thumbnail ? `
                <div class="relative h-48 overflow-hidden">
                    <img src="${post.thumbnail}" alt="${post.title}" class="w-full h-full object-cover transition-transform duration-300 hover:scale-110">
                    <div class="absolute top-4 left-4">
                        <span class="bg-${post.category.color}-100 text-${post.category.color}-600 px-3 py-1 rounded-full text-sm font-semibold">${post.category.name}</span>
                    </div>
                    <div class="absolute top-4 right-4">
                        <span class="bg-black/50 text-white px-3 py-1 rounded-full text-sm">${this.formatDate(post.created_at)}</span>
                    </div>
                </div>
                ` : `
                <div class="p-6 pb-0">
                    <div class="flex items-center mb-4">
                        <span class="bg-${post.category.color}-100 text-${post.category.color}-600 px-3 py-1 rounded-full text-sm font-semibold">${post.category.name}</span>
                        <span class="text-gray-500 text-sm ml-auto">${this.formatDate(post.created_at)}</span>
                    </div>
                </div>
                `}
                <div class="p-6 ${post.thumbnail ? 'pt-4' : ''}">
                    <h3 class="text-xl font-bold text-gray-800 mb-3 line-clamp-2">${post.title}</h3>
                    <p class="text-gray-600 mb-4 line-clamp-3">${post.excerpt}</p>
                    <div class="flex items-center justify-between">
                        <span class="text-red-600 font-semibold">Đọc thêm</span>
                        <i class="fas fa-arrow-right text-red-600"></i>
                    </div>
                </div>
            </div>
        `).join('');

        this.blogContainer.innerHTML = postsHTML;
        
        // Reinitialize AOS for new elements
        if (typeof AOS !== 'undefined') {
            AOS.refresh();
        }
        
        // Add click handlers for blog post cards
        this.addClickHandlers();
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    getPostUrl(filename) {
        // Tạo URL cho bài viết dựa trên filename
        return `post/${filename}`;
    }

    addClickHandlers() {
        // Thêm event listener cho các card bài viết
        const postCards = document.querySelectorAll('.blog-post-card');
        postCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Không chuyển hướng nếu click vào link "Đọc thêm"
                if (e.target.closest('.read-more-link')) {
                    return;
                }
                
                const postUrl = card.getAttribute('data-post-url');
                if (postUrl) {
                    // Thêm hiệu ứng loading
                    card.style.transform = 'scale(0.98)';
                    card.style.opacity = '0.8';
                    
                    // Mở bài viết trong tab mới
                    setTimeout(() => {
                        window.open(postUrl, '_blank');
                        // Khôi phục trạng thái card
                        card.style.transform = '';
                        card.style.opacity = '';
                    }, 150);
                }
            });
        });
    }

    showFallbackPosts() {
        if (!this.blogContainer) return;
        
        // Hiển thị bài đăng mặc định nếu không load được từ API
        this.blogContainer.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-all duration-300 cursor-pointer blog-post-card" data-aos="fade-up" data-post-url="post/bai-viet-1.html">
                <div class="relative h-48 overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop" alt="Khet Entertainment Team" class="w-full h-full object-cover transition-transform duration-300 hover:scale-110">
                    <div class="absolute top-4 left-4">
                        <span class="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-semibold">Tin tức</span>
                    </div>
                    <div class="absolute top-4 right-4">
                        <span class="bg-black/50 text-white px-3 py-1 rounded-full text-sm">15/01/2025</span>
                    </div>
                </div>
                <div class="p-6 pt-4">
                    <h3 class="text-xl font-bold text-gray-800 mb-3 line-clamp-2">Khet Entertainment - Hành trình phát triển</h3>
                    <p class="text-gray-600 mb-4 line-clamp-3">Với hơn 300 trang và kênh, 100+ kênh YouTube, 100+ tài khoản TikTok và 200+ sản phẩm, Khet Entertainment đã và đang khẳng định vị thế của mình trong ngành công nghiệp giải trí số.</p>
                    <div class="flex items-center justify-between">
                        <span class="text-red-600 font-semibold">Đọc thêm</span>
                        <i class="fas fa-arrow-right text-red-600"></i>
                    </div>
                </div>
            </div>
        `;
        
        // Add click handlers for fallback post
        this.addClickHandlers();
    }
}

// Khởi tạo và load bài đăng khi trang web load xong
document.addEventListener('DOMContentLoaded', function() {
    const blogLoader = new BlogLoader();
    blogLoader.loadPosts();
}); 