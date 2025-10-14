import { Guard } from "../permissions";

interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  published: boolean;
}

const samplePosts: Post[] = [
  {
    id: 1,
    title: "Getting Started with TypeScript",
    content: "TypeScript is amazing...",
    author: "John Doe",
    published: true,
  },
  {
    id: 2,
    title: "React Best Practices",
    content: "Here are some tips...",
    author: "Jane Smith",
    published: true,
  },
  {
    id: 3,
    title: "Draft Post",
    content: "Work in progress...",
    author: "Admin",
    published: false,
  },
];

export function PostList() {
  return (
    <div className="post-list">
      <div className="post-header">
        <h2>Blog Posts</h2>

        {/* Only show create button if user can create posts */}
        <Guard check="post:create">
          <button className="btn-primary">Create New Post</button>
        </Guard>
      </div>

      <div className="posts">
        {samplePosts.map((post) => (
          <div key={post.id} className="post-card">
            <h3>{post.title}</h3>
            <p className="author">By {post.author}</p>
            <p className="content">{post.content}</p>
            <p className="status">
              Status: {post.published ? "✅ Published" : "📝 Draft"}
            </p>

            <div className="post-actions">
              {/* Show edit button if user can edit posts */}
              <Guard check="post:edit">
                <button className="btn-secondary">Edit</button>
              </Guard>

              {/* Show publish button only for admins */}
              <Guard check="post:publish">
                <button className="btn-primary">
                  {post.published ? "Unpublish" : "Publish"}
                </button>
              </Guard>

              {/* Show delete button if user can delete posts */}
              <Guard check="post:delete">
                <button className="btn-danger">Delete</button>
              </Guard>

              {/* Function pattern - show different UI based on permission */}
              <Guard check="admin:dashboard">
                {(hasPermission) =>
                  hasPermission ? <span className="badge">Admin</span> : null
                }
              </Guard>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
